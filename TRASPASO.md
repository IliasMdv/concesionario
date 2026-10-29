# Nota de traspaso — Poniente · Ferrari 458 Spider 3D

Estado del proyecto a 29/10/2026 para continuar el trabajo desde otro ordenador.
Si abres una sesión nueva de Claude Code, empieza con:

> Lee `TRASPASO.md` y continúa con las tareas pendientes.

---

## 1. Puesta en marcha en el otro PC

1. Copia la carpeta del proyecto **sin `node_modules`** (se regenera; ocupa ~145 MB).
2. Necesitas **Node.js 20.19 o superior** (se desarrolló con Node 25.4 y npm 11.7).
3. En la carpeta del proyecto:

```bash
npm install
npm run dev
```

4. Abre `http://localhost:5173`.

Para recuperar el historial completo de la conversación original, copia
`C:\Users\ilias\.claude\projects\C--Users-ilias-Desktop-Saladillo-Conce\70e349ba-b925-4417-9ec7-b355f40e98b1.jsonl`
a la carpeta equivalente de `~/.claude/projects/` del otro PC (Claude Code la crea al abrir el proyecto; su nombre
depende de la ruta) y ejecuta `claude --resume` desde el proyecto.

---

## 2. Qué es

Página de una sola ruta para un concesionario **ficticio** («Poniente · Automóviles de colección», Algeciras) que
presenta un **Ferrari 458 Spider** con una película 3D controlada por el scroll, inspirada en el ritmo de
rockstargames.com/VI (escenas fijadas, textos que se revelan, cambios de luz, paleta de atardecer).

### Decisiones importantes ya tomadas

- **El coche es un 458 Spider, no un Italia.** El modelo de los ejemplos de three.js se llama «Ferrari 458 Italia»
  (vicent091036, **CC BY 4.0**), pero su geometría es la del Spider con el techo retirado: arcos antivuelco, tapa
  de motor con lamas y sin techo. Todos los textos y datos se cambiaron al Spider.
- **Datos técnicos verificados** con la ficha de lanzamiento de Ferrari (vía JustCars), Wikipedia y cars-data.com.
  Las fuentes figuran en `src/data/car.ts` y se muestran en la ficha técnica. Cifras clave: V8 de 4.499 cm³, 570 CV a
  9.000 rpm, 540 Nm a 6.000 rpm, 0–100 en menos de 3,4 s, 320 km/h, 1.430 kg en seco (con llantas forjadas y
  asientos de competición), reparto 42/58, 11,8 l/100 km, 275 g/km, techo de aluminio que se pliega en 14 s.
  **No añadir cifras sin verificar.**
- **Datos de demostración** (marcados así en la web): unidades en stock, precios, kilometrajes, extras, financiación
  (TIN 6,99 %), dirección, teléfono y correo del concesionario.
- **Formularios**: sin backend. Si se define `VITE_LEADS_ENDPOINT`, envían un POST con JSON; si no, guardan la
  solicitud en `localStorage` (`poniente:leads`) y lo dicen claramente al usuario (`src/lib/leads.ts`).
- Pie de página con el aviso de marcas (Ferrari S.p.A.) y la atribución CC BY 4.0 del modelo.

---

## 3. Arquitectura

Stack: **Vite 8 + React 19 + TypeScript 7**, **three 0.186** (sin React Three Fiber) y **GSAP 3.15 + ScrollTrigger**.
Fuentes autoalojadas con Fontsource (Archivo Variable con eje de anchura e Instrument Serif). No hay servicios
externos: el modelo, la textura de sombra y el decodificador Draco están en `public/`.

| Archivo | Función |
| --- | --- |
| `src/lib/stage.ts` | Bucle único (ticker de GSAP): lee y suaviza el scroll, mide la maqueta, calcula el plano y avisa a los suscriptores. |
| `src/three/director.ts` | **Director de cámara**: fotogramas clave `FILM` (progreso 0–1 de la película) y `SECTION_SHOTS` (secciones posteriores). Es una función pura del scroll, así que avanza y retrocede igual. Cámara orbital (`az`, `el`, `r`) + desplazamiento óptico (`sx`/`sy` en escritorio, `msx`/`msy` en vertical) + luces. |
| `src/three/experience.ts` | Renderizador: aplica el plano, renderiza solo cuando cambia algo, DPR adaptativo, bloom (`UnrealBloomPass`), proyección de puntos 3D para el DOM y `renderStill()` para capturas. |
| `src/three/studio.ts` | Entorno HDR procedural de softboxes (PMREM), suelo con reflejo real (`Reflector` + desenfoque por mipmaps, solo en calidad alta), cielo de atardecer, haces volumétricos simulados y barras de luz del plano dinámico. |
| `src/three/car.ts` | Carga del GLB con Draco y sustitución de materiales: pintura con barniz, cristal, cromo, carbono, faros y pilotos emisivos. |
| `src/three/quality.ts` | Niveles `low`/`medium`/`high` según GPU, núcleos, memoria y pantalla. Se puede forzar con `?quality=low\|medium\|high`. |
| `src/components/Film.tsx` | Las 7 escenas: timeline de GSAP en pausa que se mueve con `tl.time(progreso)`, puntos de interés y cotas proyectadas desde el 3D, contadores y bandas de cine. |
| `src/components/*` | Nav con raíl de escenas, Tecnología, Galería horizontal, Ficha técnica, Configurador (cambia pintura y llantas del 3D en vivo), Contacto y pie, diálogo de solicitud, pantalla de carga, modo sin WebGL. |
| `src/data/car.ts`, `src/data/story.ts` | Datos del coche y comerciales; guion (rangos de escenas, puntos de interés, cotas, galería). |
| `src/styles/global.css` | Toda la dirección de arte y los puntos de corte responsive (1180 px, 899 px y 480 px). |

Otros detalles:

- Tone mapping **Neutral**: AgX levantaba los negros y todo se veía gris.
- Umbral de bloom 3, para que solo brillen faros y pilotos.
- Con `prefers-reduced-motion`, el director usa cortes secos sin transiciones y sin balanceo de cámara, el
  scroll no se suaviza y los textos solo hacen fundidos.
- Sin WebGL (o si se pierde el contexto), se muestra `Fallback` con fotogramas estáticos `public/renders/scene-*.webp`.

### Herramientas de desarrollo (solo `npm run dev`)

- **Regenerar capturas** de la galería y del modo sin WebGL a partir del 3D: abre `http://localhost:5173/?renders`
  con una ventana de escritorio. Los archivos se guardan en `public/renders/` mediante el middleware de
  `vite.config.ts`. También desde la consola: `await window.__poniente.captureRenders()`.
- Depuración en consola: `window.__debug.stage` y `window.__debug.gsap`.

---

## 4. Validación ya hecha (en el navegador integrado de Claude, servidor de desarrollo)

- El modelo carga y la pantalla de carga sale bien.
- Las 7 escenas se revisaron en escritorio (1440×900): aparición, frontal, perfil con cotas, detalles con puntos
  de interés, zaga, plano dinámico con contadores y bandas de cine, y final con precio y botones.
- **Scroll hacia atrás**: mismos planos y textos que hacia delante (comprobado numéricamente).
- Tecnología, galería, ficha técnica y configurador en escritorio. El configurador cambia la pintura (Giallo
  Modena) y las llantas (negro brillo) del coche en vivo, y el total y la cuota se calculan bien.
- Diálogo «Reservar prueba»: los campos obligatorios bloquean el envío y el envío en modo demostración muestra la
  confirmación (el dato de prueba se borró después).
- Móvil (375×812): escenas 1, 3, 4 y 7 y configurador, sin scroll horizontal.
- `npx tsc -b` pasa sin errores.
- La consola solo muestra avisos `X4122` del compilador de shaders de ANGLE/Direct3D, que son inofensivos.

> Nota sobre el entorno: con el panel del navegador de la app de Claude oculto, `requestAnimationFrame` se
> congela. Para validar se forzaron fotogramas con `window.__debug.gsap.ticker.tick()` y un redimensionado antes
> de cada captura. En un navegador normal no hace falta nada de esto.

---

## 5. Pendiente (en este orden)

1. **Build de producción**: `npm run build`, `npm run preview` y `npm run lint` (oxlint). Corregir errores y
   avisos y comprobar en `preview` que el modelo, Draco y las fuentes cargan desde `dist/`.
2. **Regenerar `public/renders/`** con `?renders`: las capturas actuales son anteriores a los últimos ajustes de
   encuadre (desplazamiento óptico en frontal, zaga y final, encuadre de Tecnología y menor intensidad de los
   focos).
3. **Revisar tablet** (768×1024 y 1024×768) y la galería en móvil (se dejó a medias). Ya está aplicado y falta
   verlo: el kicker de la galería ahora va encima del título y la etiqueta «Altura» se ancla arriba de su cota.
4. **Probar los modos alternativos**: `prefers-reduced-motion`, sin WebGL (desactivar WebGL en el navegador) y
   `?quality=low`.
5. **README.md**: sustituir el de plantilla de Vite por instrucciones exactas (instalar, `dev`, `build`,
   `preview`), requisitos, `VITE_LEADS_ENDPOINT`, `?quality`, `?renders`, créditos y licencias, y la aclaración de
   datos reales frente a datos de demostración.
6. Retoques opcionales:
   - En móvil, el coche de la escena 1 se ve pequeño (bajar `fit` del primer plano de `FILM`, p. ej. a 0,75).
   - Ligeros artefactos en bloque en el reflejo de las llantas.
   - Comprobar que el contador de 0–100 termina en «3,4».
7. Recorrido final completo arriba y abajo en un navegador normal con la consola abierta.
