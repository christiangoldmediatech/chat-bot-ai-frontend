<script setup lang="ts">
// Splash intro del landing — mesh gradient 100% CSS (basado en el motif
// "SKYLRK v7"). Una sola mancha oscura viaja en bucle cerrado de 155s
// cruzando el centro del viewport sobre un degradado base primary → accent.
// Encima: grano SVG con blend overlay para textura. El wordmark LURVIAX se
// centra tipográficamente con letter-spacing amplio.
//
// El fondo está scoped a la sección (position:absolute + overflow:hidden)
// para que no colisione con el ground/canvas del hero clásico que viene
// debajo en el flujo.
</script>

<template>
  <section
    class="lm-hero relative flex min-h-screen items-center justify-center overflow-hidden"
    aria-labelledby="lm-hero-title"
  >
    <!-- Background: degradado base + grupo difuminado con mancha viajera + grano -->
    <div class="lm-bg" aria-hidden="true">
      <div class="lm-bg__blobs">
        <div class="lm-darks">
          <span class="lm-anchor lm-roam" />
        </div>
      </div>
      <div class="lm-bg__grain" />
    </div>

    <!-- Contenido: wordmark LURVIAX + tagline -->
    <div class="lm-content relative z-10 px-6 text-center">
      <h1 id="lm-hero-title" class="lm-title">
        LURVIAX
      </h1>
      <p class="lm-tagline">
        PLATAFORMA DE ASISTENTES INTELIGENTES
      </p>
    </div>
  </section>
</template>

<style scoped>
/* ============================================================
   MESH GRADIENT SCOPED — paleta LURVIAX (dark commit)
   Reemplaza los sky colors originales por el sistema de marca:
   base = azul primario + accent cian brillante, mancha viajera
   = azul noche + negro. La mancha oscura es lo que corta el
   brillo del fondo — nunca al revés.
   ============================================================ */

.lm-hero {
  /* Cuando la sección es más alta que el viewport, la mancha sigue
     confinada; no la dejamos escapar. */
  isolation: isolate;
}

/* ---------- 1. CONTENEDOR SCOPED ----------
   position:absolute (no fixed) para que la animación viva sólo dentro
   de la sección splash, sin superponerse al hero clásico de abajo. */
.lm-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background: radial-gradient(
    ellipse 110% 95% at 68% 30%,
    #5be9ec 0%,
    #077ddc 55%,
    #034871 100%
  );
}

/* ---------- 2. GRUPO DIFUMINADO ----------
   Un único filter: blur() para todas las capas. inset negativo para
   que el desenfoque no deje bordes visibles. */
.lm-bg__blobs {
  position: absolute;
  inset: -20%;
  filter: blur(80px);
}

/* ---------- 3. SISTEMA DE COORDENADAS ----------
   El grupo tiene inset:-20% → su origen está en (-20vw,-20vh). La
   clase .lm-anchor compensa ese offset y centra la caja en su punto
   de anclaje: translate3d(x,y) coloca el CENTRO de la mancha en el
   punto (x,y) del viewport. */
.lm-anchor {
  position: absolute;
  left: 20vw;
  top: 20vh;
  will-change: transform, opacity;
}

/* ---------- 4. MANCHA OSCURA VIAJERA ----------
   Núcleo denso azul noche → transparente. Recorre el viewport en
   un bucle cerrado que cruza el centro. */
.lm-roam {
  width: 70vw;
  height: 78vh;
  margin-left: -35vw;
  margin-top: -39vh;
  background: radial-gradient(
    ellipse 50% 50% at 50% 50%,
    #01142a 0%,
    #01142a 34%,
    rgba(1, 20, 42, 0.45) 56%,
    rgba(1, 20, 42, 0) 74%
  );
  animation: lm-roam 155s linear infinite;
}

/* Bucle CERRADO: 0% y 100% idénticos → sin rebote ni salto. Nunca
   uses `alternate`: al volver por el mismo camino se nota el vaivén. */
@keyframes lm-roam {
  0%   { transform: translate3d(75vw, 70vh, 0) scale(1.1);  opacity: 0.65; }
  25%  { transform: translate3d(30vw, 55vh, 0) scale(0.9);  opacity: 0.85; }
  50%  { transform: translate3d(18vw, 20vh, 0) scale(1.25); opacity: 0.55; }
  75%  { transform: translate3d(68vw, 30vh, 0) scale(1);    opacity: 0.80; }
  100% { transform: translate3d(75vw, 70vh, 0) scale(1.1);  opacity: 0.65; }
}

/* ---------- 5. INTRO ----------
   La masa entra grande y se asienta (equivale al uFadeIn del shader
   original). Wrapper aparte para no pisar los transform del roam. */
.lm-darks {
  position: absolute;
  inset: 0;
  transform-origin: 50% 50%;
  animation: lm-intro 3.2s cubic-bezier(0.16, 1, 0.3, 1) both;
}
@keyframes lm-intro {
  from { transform: scale(1.6); opacity: 1;    }
  to   { transform: scale(1);   opacity: 0.95; }
}

/* ---------- 6. GRANO ----------
   Encima y FUERA del blur (si no, se difuminaría también). */
.lm-bg__grain {
  position: absolute;
  /* inset:-8% > 4% de desplazamiento máximo ⇒ nunca se descubre el
     borde durante la animación (dejaría una banda sin grano). */
  inset: -8%;
  pointer-events: none;
  opacity: 0.30;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
  animation: lm-grain 8s steps(10) infinite;
}
@keyframes lm-grain {
  0%   { transform: translate(0, 0); }
  10%  { transform: translate(-2%, -3%); }
  20%  { transform: translate(-4%, 2%); }
  30%  { transform: translate(2%, -4%); }
  40%  { transform: translate(-1%, 3%); }
  50%  { transform: translate(-3%, 1%); }
  60%  { transform: translate(3%, 0); }
  70%  { transform: translate(0, 3%); }
  80%  { transform: translate(-3%, -1%); }
  90%  { transform: translate(2%, 2%); }
  100% { transform: translate(0, 0); }
}

/* ---------- 7. CONTENIDO ----------
   Wordmark grande (Archivo weight 200 + letter-spacing 0.35em) y
   tagline en mono más chico con letter-spacing 0.5em. Blanco puro
   con text-shadow suave para separarlo del fondo dinámico. */
.lm-title {
  margin: 0;
  font-family: Archivo, 'Chivo', ui-sans-serif, system-ui, sans-serif;
  font-variation-settings: 'wdth' 100, 'wght' 200;
  font-size: clamp(3rem, 12vw, 8rem);
  font-weight: 200;
  letter-spacing: 0.35em;
  color: #ffffff;
  text-shadow: 0 2px 40px rgba(1, 20, 42, 0.55);
  animation: lm-fade-in 1.6s cubic-bezier(0.2, 0.8, 0.3, 1) 0.4s both;
}

.lm-tagline {
  margin-top: clamp(16px, 2.5vw, 28px);
  font-family: 'Chivo Mono', ui-monospace, monospace;
  font-size: clamp(0.72rem, 1.4vw, 0.9rem);
  font-weight: 500;
  letter-spacing: 0.5em;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  animation: lm-fade-in 1.6s cubic-bezier(0.2, 0.8, 0.3, 1) 0.9s both;
}

@keyframes lm-fade-in {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: none; }
}

/* ---------- 8. ACCESIBILIDAD ---------- */
@media (prefers-reduced-motion: reduce) {
  .lm-darks,
  .lm-roam,
  .lm-bg__grain,
  .lm-title,
  .lm-tagline {
    animation: none !important;
  }
  .lm-darks { transform: none; opacity: 0.95; }
  .lm-roam  { transform: translate3d(30vw, 50vh, 0); opacity: 0.75; }
  .lm-title, .lm-tagline { opacity: 1; transform: none; }
}

/* ---------- 9. MÓVIL ---------- */
@media (max-width: 768px) {
  .lm-bg__blobs { filter: blur(55px); }
  .lm-roam { width: 110vw; margin-left: -55vw; }
}
</style>
