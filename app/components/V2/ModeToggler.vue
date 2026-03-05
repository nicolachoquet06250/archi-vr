<script setup lang="ts">
import {Plan2D, Plan3D, PlanVR} from "~/components/V2/icons";
</script>

<template>
  <section :class="[$style.modeToggler, 'mode-bar']">
    <!-- LEFT (hover/active look) -->
    <button class="mode-btn active" type="button">
      <span class="mode-icon" aria-hidden="true">
        <!-- Placeholder SVG "plan" -->
        <Plan2D :size="40" />
      </span>
      <span class="mode-text">PLAN 2D</span>
    </button>

    <!-- MIDDLE (normal) -->
    <button class="mode-btn" type="button">
      <span class="mode-icon" aria-hidden="true">
        <!-- Placeholder SVG "3D box" -->
        <Plan3D :size="40" />
      </span>
      <span class="mode-text">3D VIEW</span>
    </button>

    <!-- RIGHT (normal) -->
    <button class="mode-btn" type="button">
      <span class="mode-icon" aria-hidden="true">
        <!-- Placeholder SVG "goggles" -->
        <PlanVR :size="40" />
      </span>
      <span class="mode-text">VR MODE</span>
    </button>
  </section>
</template>

<style module>
.modeToggler {
  border: 1px solid #ffffff;

  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: stretch;
  gap: 5px;
  padding: 5px;
  width: min-content;
  background-color: #34383b;
  border-radius: 15px;
  box-shadow: none;

  svg {
    width: 24px!important;
  }

  button {
    width: min-content!important;
  }

  > button {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    gap: 5px;
    padding: 5px;
    cursor: pointer;
    background-color: transparent;
    border: 1px solid #898f91;
    color: #cfd1d2;
    flex: 1;
    border-radius: 15px;

    > span:first-child {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    > span:last-child {
      margin-top: auto;
    }
  }
}
</style>

<style scoped>
:root {
  --bar1:#1b2327;
  --bar2:#0f1417;
  --barStroke:#5b6a71;

  --strokeOuter:#242f35;     /* outer dark */
  --strokeMid:#4a5a62;       /* mid */
  --strokeInner:#12181c;     /* inner dark */

  --txtDim:#8e9aa1;
  --iconDim:#6c7982;

  --hover1:#3b4950;
  --hover2:#182126;
  --hoverStroke:#a9bbc6;

  --vr-blue: #00f2ff;
  --glow: 0, 242, 255;
}

.mode-bar{
  display:inline-flex;
  padding:8px;
  border-radius:8px;
  gap:8px; /* gap like screenshot */
}

/* separators drawn by the bar so we don't consume button pseudos */
.mode-bar > .mode-btn:not(:first-child){
  position:relative;
}
.mode-bar > .mode-btn:not(:first-child)::marker{ content:""; } /* no-op */
.mode-bar > .mode-btn:not(:first-child)::before{
  content:"";
  position:absolute;
  left:-4px;                 /* middle of the 8px gap */
  top:8px;
  bottom:8px;
  width:1px;
  background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(0,0,0,.55));
  opacity:.9;
}

.mode-btn{
  width:118px;
  height:auto;
  border-radius:6px;
  cursor:pointer;

  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:6px;

  color:var(--txtDim);
  position:relative;
  isolation:isolate;         /* clean pseudo stacking */
}

/* glossy top line / inner light */
.mode-btn::after{
  content:"";
  position:absolute;
  inset:2px;
  border-radius:5px;
  pointer-events:none;
  z-index:0;
  background:
      radial-gradient(120% 70% at 50% 0%,
      rgba(255,255,255,.18) 0%,
      rgba(255,255,255,0) 55%),
      linear-gradient(180deg,
      rgba(255,255,255,.08),
      rgba(255,255,255,0) 45%);
  opacity:.55;
}

/* icon + text */
.mode-icon{
  width:auto;
  height:auto;
  display:grid;place-items:center;
  color:var(--iconDim);
  filter:drop-shadow(0 1px 0 rgba(0,0,0,.65));
  position:relative;
  z-index:1;
}

.mode-text{
  font:700 11px/1 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  letter-spacing:.5px;
  text-transform:uppercase;
  color:#eef6fb;
  text-shadow:0 1px 0 rgba(0,0,0,.7);
  position:relative;
  z-index:1;
  width:max-content;
}

.mode-btn:hover,
.mode-btn.active {
  background: rgba(var(--glow), 0.35);
  border-color: #fff;
  -webkit-box-shadow: 2px 2px 18px 2px rgba(112,129,134,0.56);
  box-shadow: 2px 2px 18px 2px rgba(112,129,134,0.56);
}

.mode-btn:hover::after,
.mode-btn.active::after {
  opacity: 0.7;
  background: radial-gradient(circle at center, #fff 0%, rgba(var(--glow), 0.6) 40%, transparent 80%);
}

.mode-btn:hover .mode-icon,
.mode-btn.active .mode-icon{
  color:#fff;
  filter:
      drop-shadow(0 0 2px #fff)
      drop-shadow(0 0 10px var(--vr-blue))
      drop-shadow(0 0 20px rgba(var(--glow), .8));
}

.mode-btn:hover .mode-text,
.mode-btn.active .mode-text{
  color:#fff;
  text-shadow:
      0 0 2px #fff,
      0 0 10px var(--vr-blue),
      0 0 20px rgba(var(--glow), .8);
}
</style>