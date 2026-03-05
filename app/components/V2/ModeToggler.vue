<script setup lang="ts">
</script>
<template>
  <section :class="[$style.modeToggler, 'mode-bar']">
    <!-- LEFT (hover/active look) -->
    <button class="mode-btn active" type="button">
      <span class="mode-icon" aria-hidden="true">
        <!-- Placeholder SVG "plan" -->
        <svg :width="40" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M0 0H4.65139L7.77735 2.08397L7.22265 2.91603L4.34861 1H1V14H6V8H4V7H9V8H7V14H14V8H12V7H14V1H10V0H15V15H0V0Z" fill="#ffffff"/>
        </svg>
      </span>
      <span class="mode-text">PLAN 2D</span>
    </button>

    <!-- MIDDLE (normal) -->
    <button class="mode-btn" type="button">
      <span class="mode-icon" aria-hidden="true">
        <!-- Placeholder SVG "3D box" -->
        <svg :width="40" viewBox="0 0 575.284 575.285" xmlns="http://www.w3.org/2000/svg">
          <g>
            <g>
              <path fill="#ffffff" d="M167.295,287.88c-0.771,0.673-1.224,1.653-1.224,2.693V395.25c0,1.53,0.979,2.876,2.424,3.366l67.883,22.632 c0.367,0.122,0.747,0.184,1.126,0.184c0.734,0,1.469-0.233,2.069-0.674c0.93-0.673,1.481-1.738,1.481-2.876V300.513 c0-1.763-1.285-3.256-3.036-3.514l-67.883-9.939C169.119,286.901,168.079,287.208,167.295,287.88z"/>
              <path fill="#ffffff" d="M132.387,281.589l-47.846-6.977c-1.016-0.159-2.057,0.159-2.828,0.82c-0.783,0.673-1.224,1.652-1.224,2.692v88.582 c0,1.53,0.979,2.877,2.424,3.366l47.846,15.948c0.368,0.123,0.747,0.184,1.114,0.184c0.734,0,1.469-0.232,2.081-0.673 c0.918-0.673,1.469-1.738,1.469-2.876V285.09C135.422,283.327,134.137,281.834,132.387,281.589z"/>
              <path fill="#ffffff" d="M573.174,203.669L424.678,4.843c0,0-1.419-2.24-4.7-3.55c-3.28-1.322-6.475-0.392-6.475-0.392L180.184,60.694V40.057 c0-4.957-3.415-9.253-8.237-10.379l-19.499-4.504c0,0-1.261-0.343-3.036-0.245c-1.774,0.098-2.913,0.575-2.913,0.575 l-35.166,12.46c-4.247,1.505-7.087,5.52-7.087,10.024v32.179l-36.928,9.449c-2.975,0.771-5.472,2.778-6.867,5.52L1.15,212.666 c-1.653,3.268-1.518,7.148,0.367,10.282c1.885,3.133,5.251,5.08,8.911,5.166l28.103,0.587v208.558 c0,3.978,2.203,7.613,5.728,9.437L287.92,573.489c0,0,2.118,1.176,4.896,1.212c2.778,0.024,4.921-1.212,4.921-1.212 l236.098-122.963c3.513-1.836,5.716-5.459,5.728-9.437l0.416-222.096l23.917,1.652c0,0,6.255,0.71,9.78-5.018 C577.568,209.361,573.174,203.669,573.174,203.669z M282.205,546.512L59.828,430.795V229.141l177.468,3.733c0,0,0,0,0.012,0h0.024 l44.884,0.808v312.831H282.205z M530.102,196.986c-2.95-0.208-5.839,0.82-7.993,2.828c-2.154,2.007-3.378,4.834-3.391,7.772 l-0.416,227.041l-60.942,31.751V269.606c0-1.004-0.417-1.946-1.151-2.62s-1.701-1.003-2.692-0.918l-58.63,4.872 c-1.836,0.159-3.256,1.701-3.256,3.537v226.11L303.478,546.5V223.229c0-5.814-4.651-10.539-10.453-10.649l-32.901-0.6 L415.62,28.307l126.611,169.512L530.102,196.986z"/>
            </g>
          </g>
        </svg>
      </span>
      <span class="mode-text">3D VIEW</span>
    </button>

    <!-- RIGHT (normal) -->
    <button class="mode-btn" type="button">
      <span class="mode-icon" aria-hidden="true">
        <!-- Placeholder SVG "goggles" -->
        <svg :width="40" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <path fill="#ffffff" d="M3,11v10c0,1.1,0.9,2,2,2h6.2c0.5,0,1-0.2,1.4-0.6l2-2c0.8-0.8,2-0.8,2.8,0l2,2c0.4,0.4,0.9,0.6,1.4,0.6H27 c1.1,0,2-0.9,2-2V11c0-1.1-0.9-2-2-2H5C3.9,9,3,9.9,3,11z"/>
          <circle cx="9" cy="16" r="3"/>
          <circle cx="23" cy="16" r="3"/>
        </svg>
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