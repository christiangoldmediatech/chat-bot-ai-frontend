# Configuración de Facebook Meta para WhatsApp Business API

> Esta guía explica paso a paso cómo conectar un bot de la plataforma con un número de WhatsApp Business a través de la API oficial de Meta (Cloud API). Está pensada para desarrolladores y administradores que estén dando de alta un bot por primera vez.

---

## Contenido

- [Visión general del flujo](#visión-general-del-flujo)
- [Requisitos previos](#requisitos-previos)
- [Datos obligatorios desde Meta](#datos-obligatorios-desde-meta)
  - [1. App Secret](#1-app-secret)
  - [2. Phone Number ID](#2-phone-number-id)
  - [3. Access Token](#3-access-token)
  - [4. WhatsApp Business Account ID](#4-whatsapp-business-account-id)
- [Almacenamiento en la plataforma](#almacenamiento-en-la-plataforma)
- [Configuración del Webhook](#configuración-del-webhook)
  - [Callback URL](#callback-url)
  - [Verify Token](#verify-token)
  - [Suscripción de eventos](#suscripción-de-eventos)
- [Flujo completo de configuración](#flujo-completo-de-configuración)
- [Validaciones obligatorias](#validaciones-obligatorias)
- [Resolución de problemas](#resolución-de-problemas-troubleshooting)
- [Buenas prácticas y seguridad](#buenas-prácticas-y-seguridad)

---

## Visión general del flujo

El sistema usa la **WhatsApp Cloud API** de Meta. El flujo de comunicación es:

```
Cliente final  ──(mensaje WhatsApp)──►  Meta
                                          │
                                          ▼
                                    Webhook HTTPS
                                          │
                                          ▼
                                Nuestro backend (NestJS)
                                          │
                                          ▼
                                  Bot ejecuta el agente
                                          │
                                          ▼
                       Meta Graph API ◄──(respuesta del bot)
                                          │
                                          ▼
                                       Cliente final
```

Para que ese flujo funcione, cada bot necesita **4 credenciales de Meta** + **1 webhook configurado** desde el lado de Meta apuntando a nuestro backend.

---

## Requisitos previos

Antes de empezar, necesitas:

1. Una cuenta en **[Meta for Developers](https://developers.facebook.com/)**.
2. Una cuenta en **[Meta Business Manager](https://business.facebook.com/)** con permisos de administrador.
3. Un número de teléfono **dedicado** a WhatsApp Business (no puede estar registrado en WhatsApp personal o en otra cuenta de Business).
4. Acceso de OWNER o ADMIN al tenant en nuestra plataforma para poder crear/editar bots.

---

## Datos obligatorios desde Meta

Para conectar un bot con WhatsApp Business API es **obligatorio** capturar y guardar los siguientes 4 datos. Cada uno se obtiene desde una ubicación distinta dentro de Meta Developer Console.

### 1. App Secret

| Concepto | Valor |
|---|---|
| **Ubicación** | Meta Developer Console → tu App → **App Settings** → **Basic** |
| **Campo** | `App Secret` |
| **Formato** | String hexadecimal de 32 caracteres (regex: `[a-fA-F0-9]+`) |
| **Sensibilidad** | 🔒 Alta — equivalente a una contraseña |

**Descripción:**
Es la clave privada de la aplicación de Meta. Nuestro backend la usa para validar la firma HMAC-SHA256 (`X-Hub-Signature-256`) que Meta incluye en cada webhook. Sin este valor, **no podemos garantizar que un POST al webhook provenga realmente de Meta** y un atacante podría enviar mensajes falsos al sistema.

**Cómo obtenerlo:**
1. Entra a Meta Developer Console y abre tu App.
2. En el menú izquierdo: **App Settings → Basic**.
3. Junto a `App Secret`, haz clic en **Show**. Meta te pedirá la contraseña de tu cuenta de Facebook.
4. Copia el valor y guárdalo de forma segura.

> ⚠️ **Importante:** Si rotas el App Secret en Meta, debes actualizarlo también en la plataforma o todos los webhooks empezarán a ser rechazados.

**Dónde se guarda en la plataforma:**
- Campo del bot: `whatsappAppSecret`
- Cifrado en BD con AES-256-GCM (write-only desde la UI)

---

### 2. Phone Number ID

| Concepto | Valor |
|---|---|
| **Ubicación** | Meta Developer Console → tu App → **WhatsApp** → **API Setup** |
| **Campo** | `Phone number ID` |
| **Formato** | String numérico de ~15 dígitos |
| **Sensibilidad** | 🔓 Baja — identificador público |

**Descripción:**
Identificador único del número de WhatsApp dentro del grafo de Meta. Es el "endpoint" al que nuestro backend hace `POST` para enviar mensajes. **No es el número de teléfono en sí**, es un ID interno de Meta que apunta a ese número.

**Cómo obtenerlo:**
1. En Meta Developer Console: **WhatsApp → API Setup**.
2. En la sección "Send and receive messages", debajo de "From", verás un dropdown con tus números registrados.
3. Selecciona el número que quieres usar.
4. Justo debajo, en "Phone number ID", aparece el valor numérico. Cópialo.

**Ejemplo:**
```
Phone number ID: 123456789012345
```

**Dónde se guarda en la plataforma:**
- Campo del bot: `whatsappPhoneId`
- Almacenado en claro (no es secreto)

---

### 3. Access Token

| Concepto | Valor |
|---|---|
| **Ubicación** | Meta Developer Console → tu App → **WhatsApp** → **API Setup** (temporal) o **Business Manager → System Users** (permanente) |
| **Campo** | `Temporary access token` o `Permanent access token` |
| **Formato** | String que empieza con `EAA` (regex: `EAA[A-Za-z0-9_-]+`) |
| **Sensibilidad** | 🔒 Alta — credencial de acceso |

**Descripción:**
Token Bearer que nuestro backend incluye en el header `Authorization: Bearer <token>` cuando llama a la Graph API de Meta para enviar mensajes. Sin un token válido, el bot puede recibir mensajes pero **no puede responder**.

**Tipos de token:**

| Tipo | Duración | Uso |
|---|---|---|
| **Temporary** | 24 horas | Solo para pruebas en desarrollo |
| **Permanent** (System User) | Sin expiración | **Obligatorio para producción** |

**Cómo obtener un token temporal (solo para pruebas):**
1. En **WhatsApp → API Setup**, copia el valor de "Temporary access token".

**Cómo obtener un token permanente (recomendado):**
1. Entra a [Meta Business Manager](https://business.facebook.com/).
2. Ve a **Business Settings → Users → System Users**.
3. Crea un System User con rol "Admin" (o usa uno existente).
4. Asigna a ese System User la app de WhatsApp con permisos `Manage app`.
5. Asigna el WhatsApp Business Account con permisos `Manage`.
6. Click en **Generate New Token**:
   - **App:** selecciona tu app
   - **Token expiration:** `Never`
   - **Permissions:** marca `whatsapp_business_messaging` y `whatsapp_business_management`
7. Copia el token (empezará con `EAA…`).

> ⚠️ **Solo lo verás una vez.** Guárdalo en un gestor de contraseñas antes de cerrar la ventana.

**Dónde se guarda en la plataforma:**
- Campo del bot: `whatsappToken`
- Cifrado en BD con AES-256-GCM (write-only desde la UI)

---

### 4. WhatsApp Business Account ID

| Concepto | Valor |
|---|---|
| **Ubicación** | Meta Developer Console → tu App → **WhatsApp** → **API Setup** |
| **Campo** | `WhatsApp Business Account ID` (también llamado `WABA ID`) |
| **Formato** | String numérico de ~15 dígitos |
| **Sensibilidad** | 🔓 Baja — identificador público |

**Descripción:**
Identificador único de la cuenta de WhatsApp Business que agrupa uno o más números de teléfono. Es necesario para gestión avanzada como **templates de mensajes**, **métricas** y **catálogos de productos**.

**Cómo obtenerlo:**
1. En **WhatsApp → API Setup**, busca la sección "WhatsApp Business Account ID" arriba de los Phone Number IDs.
2. Copia el valor numérico.

Alternativamente, desde Business Manager: **Accounts → WhatsApp Accounts → tu WABA → Settings → WhatsApp Manager**.

**Ejemplo:**
```
WABA ID: 987654321098765
```

**Dónde se guarda en la plataforma:**
- Campo del bot: `whatsappBusinessAccountId`
- Almacenado en claro (no es secreto)

---

## Almacenamiento en la plataforma

Cuando creas o editas un bot en el panel admin (`/admin/bots/create` o `/admin/bots/[id]/edit`), encontrarás dos secciones bien diferenciadas:

1. **Bot details** — nombre, system prompt, estado activo.
2. **WhatsApp Business connection** — los 4 campos de Meta + el Verify Token del webhook.

La sección "WhatsApp Business connection" se divide internamente en:

- **Identifiers** (públicos): Phone Number ID, WABA ID
- **Secrets** (cifrados): Access Token, App Secret
- **Webhook**: Verify Token

Los **secrets** se cifran con **AES-256-GCM** antes de persistirse y nunca se devuelven en respuestas API ni se muestran en la UI. Para rotarlos, basta con introducir el nuevo valor en el campo correspondiente (dejarlo vacío mantiene el actual).

---

## Configuración del Webhook

Una vez creados/editados los 4 campos anteriores en la plataforma y guardado el bot, el sistema genera un **BOT_ID** (UUID v4). Ese ID es el último paso para configurar el webhook desde el lado de Meta.

### Callback URL

La URL del webhook que debes pegar en Meta sigue este patrón:

```
https://chat-bot-ai-backend-production.up.railway.app/api/v1/webhooks/whatsapp/{BOT_ID}
```

**Ejemplo concreto:**

Si tu bot tiene el ID `7f2f02de-6b3d-4af9-8a90-dc97fbf2cd85`, la Callback URL es:

```
https://chat-bot-ai-backend-production.up.railway.app/api/v1/webhooks/whatsapp/7f2f02de-6b3d-4af9-8a90-dc97fbf2cd85
```

> 💡 **Cada bot tiene una URL diferente.** El sistema usa el `BOT_ID` del path para identificar a qué bot pertenece el mensaje entrante, recuperar sus credenciales (token, app secret), validar la firma HMAC y rutear el procesamiento.

**Cómo obtener el BOT_ID:**
- Después de crear el bot, está en la URL del dashboard: `/admin/bots/<BOT_ID>` o `/admin/bots/<BOT_ID>/edit`.
- También está visible al final del flujo de creación.

### Verify Token

| Concepto | Valor |
|---|---|
| **Campo en la plataforma** | `Webhook verify token` |
| **Mínimo** | 16 caracteres |
| **Recomendado** | 32+ caracteres aleatorios (la UI tiene un botón "Generate") |

**Cómo funciona:**
1. Cuando configuras el webhook en Meta, ingresas este token.
2. Meta hace un `GET` al webhook con `?hub.verify_token=<el token>` para verificar que tú controlas el endpoint.
3. Nuestro backend compara el token recibido con el `webhookVerifyToken` guardado para el `BOT_ID` del path.
4. Si coinciden, devuelve el `hub.challenge` y Meta marca el webhook como **Verified**.

> ⚠️ **Crítico:** el Verify Token debe ser **exactamente el mismo** valor que guardaste en el campo del bot. Si difiere en un solo carácter o tiene espacios extra, Meta marcará el webhook como inválido y dejará de enviar eventos sin notificar.

### Pasos para configurar el webhook en Meta

1. En Meta Developer Console: **WhatsApp → Configuration**.
2. En la sección "Webhook" haz clic en **Edit**.
3. Pega:
   - **Callback URL:** la URL con el `BOT_ID` correcto.
   - **Verify Token:** el mismo valor que guardaste en el bot.
4. Click en **Verify and save**.
5. Si todo está bien, debe aparecer "✓ Verified" junto al webhook.

### Suscripción de eventos

Después de verificar el webhook, debes suscribirte a los eventos que el bot necesita escuchar.

1. En la misma sección "Webhook fields", click en **Manage**.
2. Suscríbete al menos a:
   - ✅ **`messages`** — obligatorio. Sin esto no recibirás los mensajes entrantes.
3. Opcionales según el caso de uso:
   - `message_template_status_update` — si usas templates
   - `message_status` — confirmaciones de entrega/lectura

---

## Flujo completo de configuración

Resumen end-to-end del proceso, en orden:

1. **Crear aplicación** en [Meta for Developers](https://developers.facebook.com/apps).
2. **Agregar el producto WhatsApp** desde el panel de la app.
3. **Capturar el App Secret** desde `App Settings → Basic`.
4. **Capturar el Phone Number ID** desde `WhatsApp → API Setup`.
5. **Generar y capturar el Access Token** (preferentemente permanente vía System User).
6. **Capturar el WhatsApp Business Account ID** desde `WhatsApp → API Setup`.
7. **En nuestra plataforma**, crear el bot en `/admin/bots/create`:
   - Completar la sección **Bot details** (nombre, system prompt).
   - Completar la sección **WhatsApp Business connection** con los 4 valores anteriores + un **Verify Token** generado (botón "Generate").
   - Click en **Create bot**.
8. **Copiar el BOT_ID** generado (visible en la URL del bot después de crearlo).
9. **Construir la Callback URL** sustituyendo `{BOT_ID}` en la plantilla.
10. **En Meta**, ir a `WhatsApp → Configuration → Webhook → Edit` y pegar la Callback URL y el Verify Token.
11. **Click en Verify and save** — debe aparecer "✓ Verified".
12. **Suscribirse al evento `messages`** en "Webhook fields → Manage".
13. **Probar enviando un mensaje** desde un teléfono real al número de WhatsApp Business → debe aparecer en `/admin/conversations` del panel.

---

## Validaciones obligatorias

El sistema valida lo siguiente antes de permitir activar un bot. Si alguna falla, el bot no funcionará:

| Validación | Campo | Regla |
|---|---|---|
| App Secret no vacío | `whatsappAppSecret` | Mínimo 32 caracteres hex (`[a-fA-F0-9]+`) |
| Access Token no vacío | `whatsappToken` | Debe empezar con `EAA` (regex: `EAA[A-Za-z0-9_-]+`) |
| Phone Number ID no vacío | `whatsappPhoneId` | String numérico, longitud típica 13–18 |
| WhatsApp Business Account ID no vacío | `whatsappBusinessAccountId` | String numérico |
| BOT_ID válido | path del webhook | UUID v4 — debe corresponder a un bot existente y activo |
| Callback URL válida | configurada en Meta | HTTPS obligatorio, debe responder al challenge de verificación |
| Verify Token configurado | `webhookVerifyToken` | Mínimo 16 caracteres, idéntico al de Meta |

Adicionalmente, el backend valida en cada inbound:

- **Firma HMAC-SHA256** del header `X-Hub-Signature-256` contra el App Secret del bot.
- Que el bot tenga **`isActive = true`**.
- Que el `phone_number_id` del payload coincida con el `whatsappPhoneId` guardado.

---

## Resolución de problemas (Troubleshooting)

### El webhook aparece como "Failed" o "Pending" en Meta

**Causa más probable:** el Verify Token no coincide.

- Revisa que el token en el campo del bot sea idéntico al que pegaste en Meta (sin espacios, mayúsculas/minúsculas exactas).
- Verifica que la Callback URL incluya el `BOT_ID` correcto.
- Confirma que el backend está vivo: `curl https://chat-bot-ai-backend-production.up.railway.app/api/v1/health`.

### Meta marca el webhook como verified pero no llegan mensajes

- En `WhatsApp → Configuration → Webhook fields`, confirma que estás suscrito al campo **`messages`**.
- En `WhatsApp → API Setup`, confirma que el número está conectado a tu app (no a otra).
- Revisa que el bot esté en estado **Active** en la plataforma.

### Llegan mensajes pero el bot no responde

**Causa más probable:** el Access Token expiró o es inválido.

- Si usas el token temporal (24h), genera uno permanente vía System User.
- Test rápido del token:
  ```bash
  curl -i "https://graph.facebook.com/v18.0/<PHONE_ID>?access_token=<TOKEN>"
  ```
  Si devuelve `401 OAuthException`, el token está vencido.

### El backend descarta los mensajes silenciosamente

**Causa más probable:** la validación HMAC falla porque el App Secret está mal.

- Confirma que el App Secret en el bot coincide con el de Meta (no rotado).
- Revisa los logs del backend buscando `Invalid X-Hub-Signature`.

### Mensajes aparecen duplicados

Meta reintenta el webhook si el backend tarda más de **20 segundos** en responder con 200. Asegúrate de que el handler responda rápido y procese el mensaje de forma asíncrona si es lento.

---

## Buenas prácticas y seguridad

### Seguridad

- 🔒 **Nunca commitear** el App Secret ni el Access Token al repositorio. Solo viven en la BD cifrados.
- 🔄 **Rotar el App Secret y los tokens** al menos una vez al año, o inmediatamente si sospechas que se filtraron.
- 🚫 **No reutilizar** el mismo número de WhatsApp entre tenants — cada bot debe tener su propio número y sus propias credenciales.
- ✅ **Siempre validar la firma HMAC** del webhook (App Secret obligatorio en producción).

### Operación

- 🔧 **Usar tokens permanentes** (System User) en producción. Los temporales son solo para pruebas locales.
- 📝 **Documentar el BOT_ID** y los datos de Meta de cada bot en un lugar seguro (gestor de contraseñas compartido del equipo).
- 🧪 **Probar el webhook end-to-end** después de cada cambio en Meta o en el bot, enviando un mensaje real desde un teléfono.
- 📊 **Monitorear los logs** del backend para detectar errores de validación HMAC o tokens expirados.

### Costos

- WhatsApp Cloud API es **gratuita hasta 1.000 conversaciones únicas por mes** por WABA. Después, Meta cobra por conversación según país y tipo (user-initiated vs. business-initiated).
- Las **conversaciones de servicio** (respuestas dentro de 24h al usuario) son más baratas que las **conversaciones de marketing**.
- Más info: [WhatsApp Business Pricing](https://developers.facebook.com/docs/whatsapp/pricing).

---

## Referencias oficiales

- [WhatsApp Business Platform — Getting Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Webhooks for WhatsApp Business Accounts](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [System User Access Tokens](https://developers.facebook.com/docs/marketing-api/system-users/overview)
- [HMAC validation (X-Hub-Signature)](https://developers.facebook.com/docs/messenger-platform/webhooks#validate-payloads)

---

## Checklist final

Antes de declarar un bot "listo para producción", verifica:

- [ ] Los 4 datos de Meta están guardados en el bot (App Secret, Phone Number ID, Access Token, WABA ID).
- [ ] El Access Token es **permanente** (System User), no temporal.
- [ ] El Verify Token tiene al menos 16 caracteres aleatorios.
- [ ] La Callback URL incluye el `BOT_ID` correcto y usa HTTPS.
- [ ] En Meta, el webhook aparece como **"✓ Verified"**.
- [ ] Está suscrito al evento **`messages`** en Webhook fields.
- [ ] El bot está marcado como **Active** en la plataforma.
- [ ] Enviar un mensaje real desde un teléfono lo registra en `/admin/conversations`.
- [ ] El bot responde correctamente al mensaje (token válido + agente configurado).
