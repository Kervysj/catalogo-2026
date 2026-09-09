export const UPDATED_APPS_SCRIPT_CODE = `/**
 * ============================================================
 * CATÁLOGO & ADMINISTRADOR PWA + BOT TELEGRAM
 * ============================================================
 * Pestañas requeridas en Google Sheets:
 *   1. "productos" (Columnas: ID, Nombre, Categoria, Precio_USD, Descripcion, Imagen, Disponible)
 *   2. "CONFIGURACION" (A1=parametro, B1=valor, A2=Tasa USD, B2=150)
 * ============================================================
 */

var NOMBRE_HOJA_PRODUCTOS = "productos";
var NOMBRE_HOJA_CONFIGURACION = "CONFIGURACION";
var CELDA_TASA_USD = "B2";
var VIGENCIA_TASA_MS = 24 * 60 * 60 * 1000;
var PROPERTY_ULTIMA_ACTUALIZACION_TASA = "ULTIMA_ACTUALIZACION_TASA";
var PROPERTY_TASA_FLOW = "TELEGRAM_TASA_FLOW_STATE";

/**
 * ============================================================
 * 1. DOGET: Lee el catálogo y la tasa para la Web / PWA (o procesa acciones directas)
 * ============================================================
 */
function doGet(e) {
  try {
    // Si viene una acción por GET (compatibilidad total con SPAs en Vercel sin CORS preflight)
    if (e && e.parameter && e.parameter.action) {
      var datos = e.parameter;
      if (e.parameter.payload) {
        try {
          var payloadObj = JSON.parse(e.parameter.payload);
          for (var k in payloadObj) {
            datos[k] = payloadObj[k];
          }
        } catch (err) {}
      }
      return procesarAccionWeb(datos);
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheetProductos = spreadsheet.getSheetByName(NOMBRE_HOJA_PRODUCTOS);

    if (!sheetProductos) {
      return respuestaJSON({
        ok: false,
        error: 'No se encontró la pestaña "productos".'
      });
    }

    var rows = sheetProductos.getDataRange().getValues();
    var productos = [];

    if (rows && rows.length > 0) {
      var headers = rows[0];
      var encabezados = [];

      for (var h = 0; h < headers.length; h++) {
        encabezados.push(String(headers[h] || '').trim().toLowerCase().replace(/\\s+/g, '_'));
      }

      for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var obj = { _fila: i + 1 }; // Guarda el número de fila para editar/eliminar

        for (var j = 0; j < encabezados.length; j++) {
          var colName = encabezados[j];
          if (!colName) continue;
          var val = row[j];

          if (Object.prototype.toString.call(val) === '[object Date]' && !isNaN(val.getTime())) {
            val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
          }
          obj[colName] = val;
        }

        // Determinar campos estandarizados
        obj.nombre = obj.nombre || obj.producto || obj.titulo || obj.item || '';
        obj.categoria = obj.categoria || obj.rubro || 'General';
        obj.precio_usd = convertirNumero(obj.precio_usd || obj.precio || obj.costo || 0) || 0;
        obj.descripcion = obj.descripcion || obj.detalle || '';
        obj.imagen = obj.imagen || obj.foto || obj.link_imagen || obj.url || '';
        
        // Reconocer disponible vs agotado (oculto)
        var rawStatus = String(obj.status !== undefined ? obj.status : (obj.disponible !== undefined ? obj.disponible : (obj.estado || ''))).toLowerCase().trim();
        obj.disponible = (rawStatus !== 'agotado' && rawStatus !== 'no' && rawStatus !== 'false' && rawStatus !== 'inactivo' && rawStatus !== 'oculto');
        obj.status = obj.disponible ? 'disponible' : 'agotado';
        
        obj.id = obj.id || obj.codigo || String(i);

        if (obj.nombre) {
          productos.push(obj);
        }
      }
    }

    var configuracion = obtenerConfiguracionTasa();

    return respuestaJSON({
      ok: true,
      productos: productos,
      configuracion: configuracion
    });
  } catch (error) {
    return respuestaJSON({
      ok: false,
      error: String(error)
    });
  }
}

/**
 * ============================================================
 * 2. DOPOST: Maneja tanto la PWA Web como el Webhook de Telegram
 * ============================================================
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respuestaJSON({ ok: true, mensaje: "Ping recibido" });
    }

    var datos;
    try {
      datos = JSON.parse(e.postData.contents);
    } catch (err) {
      datos = {};
    }

    // A) ACCIONES DESDE LA PÁGINA WEB ADMINISTRADORA (PWA)
    if (datos.action) {
      return procesarAccionWeb(datos);
    }

    // B) MENSAJES DE TELEGRAM (Webhook)
    if (datos.update_id || datos.message || datos.callback_query) {
      procesarActualizacionTelegram(datos);
      return HtmlService.createHtmlOutput('OK');
    }

    return respuestaJSON({ ok: true, mensaje: "Sin acción identificada" });
  } catch (error) {
    Logger.log("Error en doPost: " + error);
    return respuestaJSON({ ok: false, error: String(error) });
  }
}

/**
 * ============================================================
 * ACCIONES DE LA WEB ADMINISTRADORA
 * ============================================================
 */
function procesarAccionWeb(datos) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // 1. CAMBIAR TASA USD DESDE LA PWA
  if (datos.action === "actualizar_tasa") {
    var nuevaTasa = convertirNumero(datos.tasa);
    if (!nuevaTasa || nuevaTasa <= 0) {
      return respuestaJSON({ ok: false, error: "Tasa inválida" });
    }

    var sheetConf = spreadsheet.getSheetByName(NOMBRE_HOJA_CONFIGURACION);
    if (!sheetConf) {
      sheetConf = spreadsheet.insertSheet(NOMBRE_HOJA_CONFIGURACION);
      sheetConf.getRange("A1:B1").setValues([["parametro", "valor"]]);
      sheetConf.getRange("A2").setValue("Tasa USD");
    }

    sheetConf.getRange(CELDA_TASA_USD).setValue(nuevaTasa);
    PropertiesService.getScriptProperties().setProperty(
      PROPERTY_ULTIMA_ACTUALIZACION_TASA,
      new Date().toISOString()
    );

    return respuestaJSON({
      ok: true,
      mensaje: "Tasa actualizada a " + nuevaTasa,
      configuracion: obtenerConfiguracionTasa()
    });
  }

  // 2. CREAR PRODUCTO NUEVO
  if (datos.action === "crear_producto") {
    var p = datos.producto;
    var sheetProd = spreadsheet.getSheetByName(NOMBRE_HOJA_PRODUCTOS);
    if (!sheetProd) return respuestaJSON({ ok: false, error: 'No existe hoja "productos"' });

    var rows = sheetProd.getDataRange().getValues();
    var headers = rows[0] || ["ID", "Nombre", "Categoria", "Precio_USD", "Descripcion", "Imagen", "Disponible"];

    var nuevaFila = [];
    var idGenerado = "PROD-" + (rows.length);

    for (var h = 0; h < headers.length; h++) {
      var col = String(headers[h]).trim().toLowerCase().replace(/\\s+/g, '_');
      if (col === 'id' || col === 'codigo') nuevaFila.push(p.id || idGenerado);
      else if (col === 'nombre' || col === 'producto') nuevaFila.push(p.nombre || '');
      else if (col === 'categoria' || col === 'rubro') nuevaFila.push(p.categoria || 'General');
      else if (col === 'precio_usd' || col === 'precio') nuevaFila.push(convertirNumero(p.precio_usd) || 0);
      else if (col === 'descripcion' || col === 'detalle') nuevaFila.push(p.descripcion || '');
      else if (col === 'imagen' || col === 'foto' || col === 'link_imagen') nuevaFila.push(p.imagen || '');
      else if (col === 'disponible' || col === 'estado' || col === 'status') {
        var estadoValor = (p.disponible !== false && p.status !== 'agotado') ? 'disponible' : 'agotado';
        nuevaFila.push(estadoValor);
      }
      else nuevaFila.push(p[col] !== undefined ? p[col] : '');
    }

    sheetProd.appendRow(nuevaFila);
    return respuestaJSON({ ok: true, mensaje: "Producto agregado con éxito", id: idGenerado });
  }

  // 3. EDITAR PRODUCTO EXISTENTE
  if (datos.action === "editar_producto") {
    var p = datos.producto;
    var fila = p._fila;
    var sheetProd = spreadsheet.getSheetByName(NOMBRE_HOJA_PRODUCTOS);
    if (!sheetProd) return respuestaJSON({ ok: false, error: 'No existe hoja "productos"' });

    var headers = sheetProd.getRange(1, 1, 1, sheetProd.getLastColumn()).getValues()[0];

    // Si no tenemos número de fila exacto, buscar por ID o Nombre
    if (!fila || fila < 2) {
      var data = sheetProd.getDataRange().getValues();
      for (var r = 1; r < data.length; r++) {
        if (String(data[r][0]) === String(p.id) || String(data[r][1]) === String(p.nombre)) {
          fila = r + 1;
          break;
        }
      }
    }

    if (!fila) return respuestaJSON({ ok: false, error: "Producto no encontrado para editar" });

    for (var h = 0; h < headers.length; h++) {
      var col = String(headers[h]).trim().toLowerCase().replace(/\\s+/g, '_');
      var colNum = h + 1;

      if (col === 'nombre' || col === 'producto') sheetProd.getRange(fila, colNum).setValue(p.nombre);
      else if (col === 'categoria') sheetProd.getRange(fila, colNum).setValue(p.categoria);
      else if (col === 'precio_usd' || col === 'precio') sheetProd.getRange(fila, colNum).setValue(convertirNumero(p.precio_usd));
      else if (col === 'descripcion') sheetProd.getRange(fila, colNum).setValue(p.descripcion || '');
      else if (col === 'imagen' || col === 'foto') sheetProd.getRange(fila, colNum).setValue(p.imagen || '');
      else if (col === 'disponible' || col === 'status' || col === 'estado') {
        var estadoValor = (p.disponible !== false && p.status !== 'agotado') ? 'disponible' : 'agotado';
        sheetProd.getRange(fila, colNum).setValue(estadoValor);
      }
    }

    return respuestaJSON({ ok: true, mensaje: "Producto actualizado con éxito" });
  }

  // 4. ELIMINAR PRODUCTO
  if (datos.action === "eliminar_producto") {
    var sheetProd = spreadsheet.getSheetByName(NOMBRE_HOJA_PRODUCTOS);
    var fila = datos.fila;

    if (!fila) {
      var data = sheetProd.getDataRange().getValues();
      for (var r = 1; r < data.length; r++) {
        if (String(data[r][0]) === String(datos.id) || String(data[r][1]) === String(datos.nombre)) {
          fila = r + 1;
          break;
        }
      }
    }

    if (fila && fila >= 2) {
      sheetProd.deleteRow(fila);
      return respuestaJSON({ ok: true, mensaje: "Producto eliminado correctamente" });
    }

    return respuestaJSON({ ok: false, error: "No se encontró el producto para eliminar" });
  }

  return respuestaJSON({ ok: false, error: "Acción no reconocida: " + datos.action });
}

/**
 * ============================================================
 * 3. CONFIGURACIÓN DE TASA & UTILIDADES
 * ============================================================
 */
function obtenerConfiguracionTasa() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(NOMBRE_HOJA_CONFIGURACION);

  if (!sheet) {
    return { tasa_usd: null, tasa_activa: false, ultima_actualizacion: null, horas_desde_actualizacion: 0, vigencia_horas: 24, mensaje: 'Pestaña "CONFIGURACION" no encontrada.' };
  }

  var valorTasa = sheet.getRange(CELDA_TASA_USD).getValue();
  var tasa = convertirNumero(valorTasa);

  if (tasa === null || tasa <= 0) {
    return { tasa_usd: null, tasa_activa: false, ultima_actualizacion: null, horas_desde_actualizacion: 0, vigencia_horas: 24, mensaje: "La tasa USD no es válida." };
  }

  var propiedades = PropertiesService.getScriptProperties();
  var ultimaActualizacion = propiedades.getProperty(PROPERTY_ULTIMA_ACTUALIZACION_TASA);

  if (!ultimaActualizacion) {
    return { tasa_usd: tasa, tasa_activa: false, ultima_actualizacion: null, horas_desde_actualizacion: 0, vigencia_horas: 24, mensaje: "La tasa debe ser confirmada por primera vez." };
  }

  var fechaActualizacion = new Date(ultimaActualizacion);
  var ahora = new Date();
  var diferencia = ahora.getTime() - fechaActualizacion.getTime();
  var horasDesdeActualizacion = diferencia / (1000 * 60 * 60);
  var tasaActiva = diferencia >= 0 && diferencia <= VIGENCIA_TASA_MS;

  return {
    tasa_usd: tasa,
    tasa_activa: tasaActiva,
    ultima_actualizacion: Utilities.formatDate(fechaActualizacion, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss"),
    horas_desde_actualizacion: Math.round(horasDesdeActualizacion * 10) / 10,
    vigencia_horas: 24,
    mensaje: tasaActiva ? "Tasa vigente." : "La tasa ha vencido (más de 24 horas sin actualizar)."
  };
}

function convertirNumero(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') return isNaN(valor) ? null : valor;
  var texto = String(valor).trim().replace(/\\s/g, '');
  if (texto.indexOf(',') !== -1 && texto.indexOf('.') === -1) {
    texto = texto.replace(',', '.');
  }
  var numero = parseFloat(texto);
  return isNaN(numero) ? null : numero;
}

function respuestaJSON(datos) {
  return ContentService.createTextOutput(JSON.stringify(datos)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * ============================================================
 * 4. BOT DE TELEGRAM - CONFIGURACIÓN & WEBHOOK
 * ============================================================
 */

// NOTA: Reemplaza con la URL exacta de tu implementación activa
var TELEGRAM_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbzajBZ9Omedm3AybJ6g3n6Fjb--RTFNY2nBPmNxLiOSN6Xyxzr6kW9CBvjLH4lsTK2jYQ/exec';

function obtenerTokenTelegram() {
  var token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_BOT_TOKEN');
  if (!token) throw new Error('No se encontró TELEGRAM_BOT_TOKEN en Propiedades del proyecto.');
  return token;
}

/**
 * ¡IMPORTANTE! EJECUTA ESTA FUNCIÓN EN EL EDITOR PARA REGISTRAR EL WEBHOOK EN TELEGRAM
 */
function configurarWebhookTelegram() {
  var token = obtenerTokenTelegram();
  var url = 'https://api.telegram.org/bot' + token + '/setWebhook';
  var respuesta = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      url: TELEGRAM_WEBHOOK_URL,
      max_connections: 40,
      drop_pending_updates: true
    }),
    muteHttpExceptions: true
  });
  Logger.log("Resultado configurarWebhook: " + respuesta.getContentText());
  return respuesta.getContentText();
}

function verificarWebhookTelegram() {
  var token = obtenerTokenTelegram();
  var url = 'https://api.telegram.org/bot' + token + '/getWebhookInfo';
  var respuesta = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  Logger.log("Info del Webhook: " + respuesta.getContentText());
  return respuesta.getContentText();
}

function eliminarWebhookTelegram() {
  var token = obtenerTokenTelegram();
  var url = 'https://api.telegram.org/bot' + token + '/deleteWebhook';
  var respuesta = UrlFetchApp.fetch(url, { method: 'post', payload: { drop_pending_updates: true }, muteHttpExceptions: true });
  Logger.log("Webhook eliminado: " + respuesta.getContentText());
  return respuesta.getContentText();
}

function probarTelegram() {
  var token = obtenerTokenTelegram();
  var url = 'https://api.telegram.org/bot' + token + '/getMe';
  var respuesta = UrlFetchApp.fetch(url, { method: 'get', muteHttpExceptions: true });
  Logger.log("Bot info: " + respuesta.getContentText());
  return respuesta.getContentText();
}

/**
 * Manejo de mensajes de Telegram
 */
function esAdministradorTelegram(chatId) {
  var adminId = PropertiesService.getScriptProperties().getProperty('TELEGRAM_ADMIN_CHAT_ID');
  if (!adminId) return false;
  return String(chatId) === String(adminId);
}

function configurarAdministradorTelegram(chatId) {
  PropertiesService.getScriptProperties().setProperty('TELEGRAM_ADMIN_CHAT_ID', String(chatId));
}

function enviarMensajeTelegram(token, chatId, texto) {
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: texto }),
    muteHttpExceptions: true
  });
}

function enviarMensajeConTecladoTelegram(token, chatId, texto, teclado) {
  UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: texto, reply_markup: { inline_keyboard: teclado } }),
    muteHttpExceptions: true
  });
}

function procesarActualizacionTelegram(actualizacion) {
  var token = obtenerTokenTelegram();

  // Callbacks de botones inline
  if (actualizacion.callback_query) {
    var cb = actualizacion.callback_query;
    if (!cb.message || !cb.message.chat) return;
    var chatIdCb = cb.message.chat.id;

    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/answerCallbackQuery', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ callback_query_id: cb.id }),
      muteHttpExceptions: true
    });

    if (!esAdministradorTelegram(chatIdCb)) {
      enviarMensajeTelegram(token, chatIdCb, '🔒 No tienes permisos de administrador. Usa /admin si eres el dueño.');
      return;
    }

    if (cb.data === 'admin_tasa') iniciarCambiarTasaTelegram(token, chatIdCb);
    else if (cb.data === 'tasa_cancelar') cancelarTasaTelegram(token, chatIdCb);
    else if (cb.data === 'lista_menu') enviarMenuAdministrativoTelegram(token, chatIdCb);
    return;
  }

  // Mensajes de texto
  var msg = actualizacion.message;
  if (!msg || !msg.chat) return;
  var chatId = msg.chat.id;
  var texto = String(msg.text || '').trim();

  // Comando de registro de administrador
  if (texto === '/admin') {
    var props = PropertiesService.getScriptProperties();
    var adminActual = props.getProperty('TELEGRAM_ADMIN_CHAT_ID');
    if (!adminActual) {
      configurarAdministradorTelegram(chatId);
      enviarMensajeTelegram(token, chatId, '👑 Registrado como administrador con éxito!\\n\\nUsa /menu para cambiar la tasa USD.');
      return;
    }
  }

  if (!esAdministradorTelegram(chatId)) {
    enviarMensajeTelegram(token, chatId, '🔒 No tienes permisos para usar este bot.');
    return;
  }

  if (texto === '/start' || texto === '/prueba') {
    enviarMensajeTelegram(token, chatId, '✅ Bot de Catálogo activo y conectado a Google Sheets.\\n\\nUsa /menu para ver opciones.');
    return;
  }

  if (texto === '/menu') {
    enviarMenuAdministrativoTelegram(token, chatId);
    return;
  }

  if (texto === '/cancelar') {
    cancelarTasaTelegram(token, chatId);
    return;
  }

  if (procesarTasaTelegram(token, chatId, msg)) {
    return;
  }

  enviarMensajeTelegram(token, chatId, 'ℹ️ Usa /menu para interactuar con la tasa.');
}

function enviarMenuAdministrativoTelegram(token, chatId) {
  var conf = obtenerConfiguracionTasa();
  var texto = '🤖 PANEL DE CONTROL TELEGRAM\\n\\n' +
    'Tasa actual: ' + (conf.tasa_usd ? conf.tasa_usd + ' Bs/USD' : 'No fijada') + '\\n' +
    'Estado: ' + (conf.tasa_activa ? '🟢 Vigente' : '🔴 Vencida') + '\\n' +
    'Horas: ' + conf.horas_desde_actualizacion + 'h transcurridas';

  enviarMensajeConTecladoTelegram(token, chatId, texto, [
    [{ text: '💵 Cambiar tasa USD', callback_data: 'admin_tasa' }]
  ]);
}

function iniciarCambiarTasaTelegram(token, chatId) {
  PropertiesService.getScriptProperties().setProperty(PROPERTY_TASA_FLOW, String(chatId));
  var conf = obtenerConfiguracionTasa();
  enviarMensajeConTecladoTelegram(token, chatId, '💵 CAMBIO DE TASA USD\\n\\nActual: ' + (conf.tasa_usd || 'N/A') + '\\n\\nEscribe el nuevo valor numérico (ej: 155):', [
    [{ text: '❌ Cancelar', callback_data: 'tasa_cancelar' }]
  ]);
}

function procesarTasaTelegram(token, chatId, mensaje) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty(PROPERTY_TASA_FLOW) !== String(chatId)) return false;

  var nuevaTasa = convertirNumero(mensaje.text);
  if (!nuevaTasa || nuevaTasa <= 0) {
    enviarMensajeTelegram(token, chatId, '⚠️ Por favor escribe un número válido mayor a 0 (ejemplo: 150 o 152.5).');
    return true;
  }

  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(NOMBRE_HOJA_CONFIGURACION);
  if (!sheet) {
    props.deleteProperty(PROPERTY_TASA_FLOW);
    enviarMensajeTelegram(token, chatId, '❌ Error: Falta la pestaña "CONFIGURACION" en Google Sheets.');
    return true;
  }

  sheet.getRange(CELDA_TASA_USD).setValue(nuevaTasa);
  props.setProperty(PROPERTY_ULTIMA_ACTUALIZACION_TASA, new Date().toISOString());
  props.deleteProperty(PROPERTY_TASA_FLOW);

  enviarMensajeConTecladoTelegram(token, chatId, '✅ TASA USD ACTUALIZADA A: ' + nuevaTasa + '\\n\\nVigencia renovada por 24 horas.', [
    [{ text: '🤖 Volver al menú', callback_data: 'lista_menu' }]
  ]);
  return true;
}

function cancelarTasaTelegram(token, chatId) {
  PropertiesService.getScriptProperties().deleteProperty(PROPERTY_TASA_FLOW);
  enviarMensajeConTecladoTelegram(token, chatId, '❌ Operación cancelada.', [
    [{ text: '🤖 Menú', callback_data: 'lista_menu' }]
  ]);
}
`;
