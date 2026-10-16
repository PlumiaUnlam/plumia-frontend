import type { Metadata } from "next"

import { AuthShell } from "@/components/form/auth-shell"

// El título lleva solo el texto: el layout raíz ya aplica el template
// "%s | PlumIA" (app/layout.tsx:20), así que agregar el suficiente a mano
// duplicaría el nombre de la marca en la pestaña.
export const metadata: Metadata = {
  title: "Términos y condiciones",
  description:
    "Condiciones de uso de PlumIA: tu cuenta, tu contenido, el uso de inteligencia artificial y tus derechos bajo la Ley 25.326.",
}

/**
 * Los textos entre {{LLAVES}} son datos que sólo puede completar quien opera
 * el servicio: no se dejan inventados porque un término con datos falsos es
 * peor que uno sin firmar.
 */
const SECCIONES = [
  {
    titulo: "1. Objeto",
    parrafos: [
      "Estos términos regulan el uso de PlumIA, una plataforma de escritura que permite organizar manuscritos, personajes, escenas, wiki y material de worldbuilding en un solo lugar.",
      "Al crear una cuenta o usar la aplicación declarás haber leído y aceptado estas condiciones en su totalidad.",
    ],
  },
  {
    titulo: "2. Tu cuenta",
    parrafos: [
      "Para usar PlumIA necesitás una cuenta asociada a un correo electrónico válido. Te comprometés a:",
    ],
    items: [
      "Informar datos verdaderos y mantenerlos actualizados.",
      "No compartir tus credenciales ni permitir que otra persona use tu cuenta.",
      "Notificarnos ante cualquier uso no autorizado.",
      "Ser mayor de 18 años, o contar con la autorización de tu tutor legal.",
    ],
  },
  {
    titulo: "3. Tu contenido",
    parrafos: [
      "Todo lo que escribís en PlumIA —manuscritos, capítulos, escenas, personajes, wiki, imágenes y cualquier otro material— sigue siendo tuyo. PlumIA no adquiere derechos de autor sobre tu obra.",
      "Nos otorgás únicamente la licencia técnica necesaria para almacenar, procesar y mostrarte tu contenido dentro del servicio, y para generar las funciones que solicitás. Esa licencia termina cuando eliminás la cuenta.",
    ],
  },
  {
    titulo: "4. Servicios con inteligencia artificial",
    parrafos: [
      "PlumIA incorpora funciones asistidas por modelos de inteligencia artificial de terceros, entre ellos Google Gemini. Esas funciones incluyen el chat sobre tu manuscrito y tu wiki, la generación de resúmenes y la búsqueda semántica.",
      "Para que funcionen, el contenido seleccionado se envía a los proveedores de IA indicados en el sitio de terceros. Te recomendamos no cargar material que no quieras procesar de esa manera.",
      "Las sugerencias generadas por IA son automáticas y pueden ser imprecisas o inconsistentes. La revisión y la responsabilidad sobre el contenido final son tuyas.",
    ],
  },
  {
    titulo: "5. Planes del servicio",
    parrafos: [
      "PlumIA ofrece un plan gratuito (FREE) y un plan con funciones adicionales (PRO). Las características de cada uno se detallan en la aplicación y pueden variar.",
      "Si contratás un plan de pago, las condiciones de facturación, renovación y cancelación se informan en el momento de la contratación.",
    ],
  },
  {
    titulo: "6. Privacidad de tus datos",
    parrafos: [
      "Tratamos tus datos personales conforme a la Ley 25.326 de Protección de Datos Personales de la República Argentina.",
      "Podés ejercer los derechos de acceso, rectificación, actualización y supresión de tus datos en cualquier momento. La supresión de la cuenta es total e irreversible: se borran tus proyectos, capítulos, escenas, imágenes y credenciales de acceso.",
    ],
  },
  {
    titulo: "7. Conductas prohibidas",
    parrafos: ["No podés usar PlumIA para:"],
    items: [
      "Publicar contenido ilegal, difamatorio o que infrinja derechos de terceros.",
      "Intentar acceder a cuentas o sistemas ajenos.",
      "Reverter, descompilar o explotar técnicamente el servicio fuera de lo permitido por ley.",
      "Usar la aplicación para automatizar usos abusivos o que degraden el servicio para otras personas.",
    ],
  },
  {
    titulo: "8. Disponibilidad y cambios",
    parrafos: [
      "Trabajamos para que PlumIA esté disponible de forma continua, pero no garantizamos que el servicio no tenga interrupciones, errores o pérdida de datos.",
      "Podemos modificar o retirar funciones, o actualizar estos términos, en cualquier momento. Te avisaremos los cambios relevantes dentro de la aplicación o por correo.",
    ],
  },
  {
    titulo: "9. Limitación de responsabilidad",
    parrafos: [
      "PlumIA se ofrece tal cual, sin garantías adicionales a las que la ley imponga de manera irrenunciable. En la medida permitida por la normativa, no respondemos por lucro cesante, pérdida de datos o daños derivados del uso o la imposibilidad de uso del servicio.",
      "El respaldo de tus manuscritos es tu responsabilidad: te recomendamos mantener una copia propia de tu obra.",
    ],
  },
  {
    titulo: "10. Legislación aplicable",
    parrafos: [
      "Estos términos se rigen por las leyes de la República Argentina. Cualquier controversia se someterá a los tribunales competentes.",
    ],
  },
  {
    titulo: "11. Contacto",
    parrafos: [
      "Si tenés dudas sobre estos términos o sobre el tratamiento de tus datos, escribinos a contacto@plumia.com.ar",
      "Última actualización: OCTUBRE DEL 2026.",
    ],
  },
]

export default function TerminosYCondicionesPage() {
  return (
    <AuthShell
      title="Términos y condiciones"
      description="Leé las condiciones de uso de PlumIA antes de crear tu cuenta."
      footer={<p>PlumIA · Tu espacio de escritura</p>}
    >
      <div className="flex flex-col gap-4">
        {SECCIONES.map((seccion) => (
          <section key={seccion.titulo}>
            <h2 className="text-base font-semibold">{seccion.titulo}</h2>
            {seccion.parrafos.map((parrafo) => (
              <p
                key={parrafo}
                className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
              >
                {parrafo}
              </p>
            ))}
            {seccion.items ? (
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm leading-relaxed text-muted-foreground">
                {seccion.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </AuthShell>
  )
}
