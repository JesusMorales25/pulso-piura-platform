import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL_VERSION } from "@/lib/legal";

const pages = {
  privacidad: {
    title: "Privacidad en la demostración",
    sections: [
      [
        "Datos y finalidades",
        "Recibimos del proveedor de identidad tu identificador, correo, verificación del correo, nombre y foto cuando están disponibles. Guardamos tu perfil deportivo, distrito opcional, biografía opcional, visibilidad, membresías, partidos, reservas, inscripciones y estados de pagos para operar esas funciones. Si el ambiente habilita pagos externos, guardamos además la imagen del comprobante, importe, método, referencia opcional, receptor y decisiones de revisión. No solicites ni adjuntes claves, OTP o datos ajenos al movimiento. El producto no guarda tu contraseña; la administra el proveedor de identidad.",
      ],
      [
        "Qué ven otras personas",
        "Los partidos públicos se muestran en Explorar. Un partido privado queda fuera del catálogo, pero una persona con su enlace y sesión puede abrirlo. Los nombres y fotos del perfil solo se muestran públicamente si elegiste visibilidad pública. El organizador puede gestionar los participantes de su partido y sus pagos; el personal autorizado de un complejo puede gestionar sus reservas. Los administradores de plataforma pueden acceder a datos necesarios para soporte y gestión.",
      ],
      [
        "Personas agregadas por el organizador",
        "El organizador puede registrar un nombre, teléfono opcional y estado de pago directo de una persona sin cuenta. Debe informarle de este registro y contar con autorización para facilitar sus datos. El teléfono no aparece en el tablero público.",
      ],
      [
        "Proveedores y enlaces",
        "La demo usa Auth0 para identidad, Vercel para la web y Render con PostgreSQL para la API y los datos. Google es una conexión opcional del proveedor de identidad. El proveedor OIDC puede cambiar por ambiente. Al abrir WhatsApp o Google Maps se aplican sus políticas; no los cargamos como herramientas de seguimiento. Los comprobantes se almacenan de forma privada por el operador de este ambiente; el pagador y el organizador del partido o dueño del complejo correspondiente pueden consultarlos. No se publican junto al partido ni se comparten con los otros jugadores. Una foto externa configurada en un perfil o negocio puede comunicar al servidor de esa foto tu dirección IP.",
      ],
      [
        "Seguridad y registros",
        "Registramos eventos de operaciones y auditoría para trazabilidad. El límite de escrituras guarda un identificador derivado de la cuenta y un contador por minuto, sin guardar el token, correo ni dirección IP en ese contador; se limpia cada hora al superar 24 horas. Los proveedores de alojamiento e identidad pueden conservar sus propios registros de acceso y seguridad según su configuración.",
      ],
      [
        "Conservación",
        "Los borradores del navegador y el estado OIDC se conservan durante la sesión de la pestaña. La preferencia de distrito permanece en este dispositivo hasta cambiarla o borrar los datos del sitio. Los registros de cuentas, operaciones, auditoría y aceptación permanecen en la base mientras se realiza la demo. Las imágenes de comprobantes con revisión final confirmada o rechazada tienen un plazo técnico configurable de conservación (90 días por defecto); los casos sin resolver se conservan para su atención. El registro financiero e historial de decisiones permanecen. No existe todavía eliminación automática de cuentas ni de su historial; el responsable debe definir y ejecutar el plazo de cierre de la demo antes de recopilar datos reales de forma generalizada.",
      ],
      [
        "Tus opciones y solicitudes",
        "Puedes modificar los datos opcionales y la visibilidad desde Perfil, y cerrar tu sesión. Para solicitar acceso, rectificación, cancelación u oposición de datos, contacta a la persona que te facilitó esta demostración. El canal formal, identidad y dirección del responsable todavía no han sido proporcionados y se publicarán antes del lanzamiento comercial. Usa datos de prueba mientras estén pendientes.",
      ],
    ],
  },
  cookies: {
    title: "Cookies y almacenamiento",
    sections: [
      [
        "En esta web",
        "No hemos integrado analíticas, publicidad, píxeles ni cookies opcionales de seguimiento. Por ello no se solicita una aceptación de cookies opcionales que no existen. No hay consentimiento de marketing implícito al usar el servicio.",
      ],
      [
        "Sesión de acceso",
        "El cliente OIDC usa sessionStorage con claves oidc.user y oidc de su biblioteca para la sesión y el estado de autorización, incluyendo tokens. Este almacenamiento es necesario para recuperar el acceso en la pestaña, es accesible al JavaScript del sitio y no es una cookie HttpOnly. Cerrar sesión elimina el usuario OIDC; cerrar la pestaña termina su almacenamiento. Auth0 o el proveedor OIDC puede usar sus propias cookies de autenticación en su dominio; su duración y configuración dependen del proveedor.",
      ],
      [
        "Preferencias y borradores",
        "pulso:district en localStorage recuerda el filtro de distrito sin fecha automática de caducidad. Los borradores de partido y de sede/cancha usan sessionStorage con una clave asociada a tu usuario y se retiran al completar el registro. Puedes borrar estos datos desde la configuración del navegador; perderás borradores y preferencias.",
      ],
      [
        "Cambios futuros",
        "Antes de incorporar tecnologías opcionales se deberá implementar un control que las bloquee hasta tu decisión y permita aceptar, rechazar y configurar con igual facilidad. Esta página se actualizará con proveedor, finalidad y duración efectivos.",
      ],
    ],
  },
  terminos: {
    title: "Condiciones de la demostración",
    sections: [
      [
        "Servicio",
        "Pulso Piura es una demostración web para descubrir partidos, convocar participantes y administrar complejos, horarios y reservas en Piura, Perú. Puede contener registros de prueba. No garantiza disponibilidad continua, asistencia de jugadores ni autenticidad de información cargada por terceros.",
      ],
      [
        "Cuentas y permisos",
        "El acceso utiliza un proveedor de identidad. Debes proteger tu cuenta, aportar información adecuada para la prueba y respetar a otras personas. Organizar requiere correo verificado; administrar un complejo requiere acceso autorizado. No intentes acceder a recursos de otros usuarios o complejos ni publiques contenido sin autorización.",
      ],
      [
        "Información publicada",
        "El responsable de cada partido o complejo debe comprobar ubicación, horarios, cuotas y datos de sus participantes. Las calificaciones informadas por un complejo son datos declarados por ese complejo, no reseñas verificadas. Las imágenes referenciales no acreditan instalaciones reales.",
      ],
      [
        "Pagos y cancelaciones",
        "Según la configuración del ambiente, el servicio permite simulación o registro de transferencias externas por Yape/Plin. No ejecuta transferencias ni recibe fondos. Adjuntar un comprobante solo inicia una revisión; la confirmación es una declaración del receptor tras revisar sus movimientos, no una verificación bancaria de Pulso Piura. Consulta Cancelaciones y pagos antes de confirmar.",
      ],
      [
        "Responsable y alcance",
        "La identidad legal, RUC cuando corresponda, dirección y canales formales de atención están pendientes de aportación por el responsable. Estas condiciones describen la prueba actual y no certifican cumplimiento legal ni reemplazan una revisión jurídica antes del servicio comercial. No uses la demo como pasarela de pagos reales.",
      ],
    ],
  },
  cancelaciones: {
    title: "Cancelaciones y pagos externos",
    sections: [
      [
        "Sin pasarela de pagos",
        "El botón Simular pago registra un resultado de prueba. No solicita datos de tarjeta ni transfiere dinero por Yape o Plin. Si entregas dinero directamente a un organizador, ese pago ocurre fuera de esta integración; consulta con él sus condiciones y comprobante.",
      ],
      [
        "Reservas de cancha",
        "El horario se retiene durante el contador indicado. En pago externo, enviar el comprobante concede un plazo limitado de revisión que no puede superar el inicio. Una solicitud vencida no recupera automáticamente el horario. Puedes cancelar hasta dos horas antes del inicio según las reglas de la reserva; cualquier importe externo entregado y su devolución deben aclararse con el receptor. Pulso Piura no realiza devoluciones bancarias. Los importes simulados siguen identificados como prueba.",
      ],
      [
        "Partidos",
        "El pago de inscripción se realiza al organizador; no acredita el pago del alquiler de la cancha. La cuota y política particular aparecen en el partido antes de confirmar. Un pago de prueba confirmado mantiene su trazabilidad y no se modifica como pago directo. Para cambios sobre un pago externo, contacta al organizador. La app no dispone de una pasarela ni procedimiento automatizado de reembolso real.",
      ],
      [
        "Antes de cobrar",
        "El lanzamiento con cobros reales requiere proveedor de pagos, procedimiento de devolución, plazos, canal de reclamos y validación legal de las condiciones. El modo manual no sustituye esos controles ni constituye una pasarela. Antes de habilitar transferencias externas, el responsable debe definir atención, condiciones y resolución de pagos tardíos.",
      ],
    ],
  },
} as const;

export function generateStaticParams() {
  return Object.keys(pages).map((section) => ({ section }));
}

export default async function InformationPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!(section in pages)) notFound();
  const page = pages[section as keyof typeof pages];
  return (
    <main className="informationPage">
      <Link href="/perfil">Volver al perfil</Link>
      <p className="eyebrow">INFORMACIÓN DEL SERVICIO</p>
      <h1>{page.title}</h1>
      <p>Versión {LEGAL_VERSION} · 22 de octubre de 2026</p>
      <p className="notice">
        Demostración. Datos empresariales pendientes de publicación.
      </p>
      {page.sections.map(([title, text]) => (
        <section key={title}>
          <h2>{title}</h2>
          <p>{text}</p>
        </section>
      ))}
    </main>
  );
}
