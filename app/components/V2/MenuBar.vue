<script setup lang="ts">
const {toggle} = useCompass()
const {change: changeToolbarSide} = useToolbar()
</script>

<template>
  <ul :class="$style.menu">
    <li>
      <button>File</button>

      <ul>
        <li><button>New Project</button></li>
        <li><button>Open Project</button></li>
        <li :class="$style.separator" />
        <li><button>Save</button></li>
        <li><button>Save As</button></li>
        <li :class="$style.separator" />
        <li><button>Import Model</button></li>
        <li><button>Export View</button></li>
        <li><button>Share</button></li>
        <li><button>Project Settings</button></li>
        <li><button>Print</button></li>
        <li><button>Quit</button></li>
      </ul>
    </li>
    <li>
      <button>Edit</button>

      <ul>
        <li><button>Undo</button></li>
        <li><button>Redo</button></li>
        <li :class="$style.separator" />
        <li><button>Cut</button></li>
        <li><button>Copy</button></li>
        <li><button>Past</button></li>
        <li><button>Past in Place</button></li>
        <li><button>Delete</button></li>
        <li :class="$style.separator" />
        <li><button>Select All</button></li>
        <li :class="$style.separator" />
        <li><button>Move</button></li>
        <li><button>Rotate</button></li>
        <li><button>Mirror</button></li>
        <li :class="$style.separator" />
        <li><button>Group</button></li>
        <li><button>Ungroup</button></li>
        <li :class="$style.separator" />
        <li><button>Preferences</button></li>
      </ul>
    </li>
    <li>
      <button>Design</button>

      <ul>
        <li><button>Move</button></li>
        <li><button>Rotate</button></li>
        <li><button>Scale</button></li>
        <li><button>Duplicate</button></li>
        <li><button>Array</button></li>
        <li><button>Mirror</button></li>
        <li :class="$style.separator" />
        <li><button>Group</button></li>
        <li><button>Ungroup</button></li>
        <li :class="$style.separator" />
        <li><button>Align Top</button></li>
        <li><button>Align Middle</button></li>
        <li><button>Align Bottom</button></li>
        <li><button>Align Left</button></li>
        <li><button>Align Center</button></li>
        <li><button>Align Right</button></li>
        <li :class="$style.separator" />
        <li><button>Merge Walls</button></li>
        <li :class="$style.separator" />
        <li><button>Create Roof</button></li>
        <li><button>Add Door</button></li>
        <li><button>Add Window</button></li>
        <li :class="$style.separator" />
        <li><button>Style Editor</button></li>
      </ul>
    </li>
    <li>
      <button>Objects</button>

      <ul>
        <li><button>Walls</button></li>
        <li><button>Doors</button></li>
        <li><button>Windows</button></li>
        <li><button>Stairs</button></li>
        <li :class="$style.separator"/>
        <li><button>Columns</button></li>
        <li><button>Beams</button></li>
        <li><button>Roofs</button></li>
        <li :class="$style.separator"/>
        <li><button>Living Room Furniture</button></li>
        <li><button>Kitchen Cabinets</button></li>
        <li><button>Bathroom Set</button></li>
        <li><button>Bathroom Fixtures</button></li>
        <li><button>Office Equipment</button></li>
        <li><button>Lighting Fixtures</button></li>
        <li><button>Appliances</button></li>
        <li><button>Decor Items</button></li>
        <li><button>Plants</button></li>
        <li><button>Art Pieces</button></li>
        <li><button>Accessories</button></li>
        <li :class="$style.separator"/>
        <li><button>Create Custom Object...</button></li>
        <li><button>Edit Object Style...</button></li>
      </ul>
    </li>
    <li>
      <button>Views</button>

      <ul>
        <li><button>Standard Top View</button></li>
        <li><button>Front Elevation</button></li>
        <li><button>Left Elevation</button></li>
        <li><button>Right Elevation</button></li>
        <li><button>Rear Elevation</button></li>
        <li :class="$style.separator"/>
        <li><button>3D Walkthrough Mode</button></li>
        <li :class="$style.separator"/>
        <li><button>Fit to Screen</button></li>
        <li><button>Zoom In</button></li>
        <li><button>Zoom Out</button></li>
        <li><button>Previous View</button></li>
        <li :class="$style.separator"/>
        <li><button>Save Current View</button></li>
        <li><button>Manage Saved Views</button></li>
        <li :class="$style.separator"/>
        <li><button>Section Planes</button></li>
        <li :class="$style.separator"/>
        <li><button>Toggle Grid</button></li>
        <li><button>Toggle Dimensions</button></li>
        <li :class="$style.separator"/>
        <li><button>Display Quality (Draft/Final)</button></li>
        <li><button>Lighting Setup</button></li>
      </ul>
    </li>
    <li>
      <button>Tools</button>

      <ul>
        <li><button>Distance Measurer</button></li>
        <li><button>Annotator</button></li>
        <li><button>Tag Creator</button></li>
        <li><button>Area & Volume Calculator</button></li>
        <li :class="$style.separator"/>
        <li><button>Align & Space</button></li>
        <li><button>Merge Walls</button></li>
        <li :class="$style.separator"/>
        <li><button>Create Roof</button></li>
        <li :class="$style.separator"/>
        <li><button>Edit Materials</button></li>
        <li><button>Library Manager...</button></li>
        <li><button>Solar Study</button></li>
        <li><button>Lighting Analysis</button></li>
        <li><button>Object Inspector</button></li>
        <li><button>Validate Design Rules</button></li>
        <li :class="$style.separator"/>
        <li><button>Import/Export Settings</button></li>
        <li><button>Open Console</button></li>
        <li :class="$style.separator"/>
        <li><button @click="changeToolbarSide('left')">Toolbar Left</button></li>
        <li><button @click="changeToolbarSide('top')">Toolbar Top</button></li>
        <li><button @click="changeToolbarSide('right')">Toolbar Right</button></li>
        <li><button @click="changeToolbarSide('bottom')">Toolbar Bottom</button></li>
        <li :class="$style.separator"/>
        <li><button @click="toggle">Toggle Compass</button></li>
      </ul>
    </li>
    <li>
      <button>Help</button>

      <ul>
        <li><button>Documentation</button></li>
        <li><button>VR Setup Guide</button></li>
        <li><button>Keyboard Shortcut</button></li>
        <li><button>Check for update</button></li>
        <li><button>About ArchiVR</button></li>
      </ul>
    </li>
  </ul>
</template>

<style module>
.menu {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  list-style: none;
  padding: 0;
  margin: 0;
  background-color: #333b3d;

  > li {
    display: inline-flex;
    padding: 0;
    position: relative;

    &:hover > button + ul {
      display: flex;
    }

    > button + ul {
      border-radius: 0 0 5px 5px;
    }

    &:first-of-type > button + ul {
      border-radius: 0 0 5px 0;
    }

    /*&:last-of-type > button + ul {
      border-radius: 0 0 0 5px;
    }*/

    &:nth-last-of-type(-n+2) > button + ul {
      left: auto;
      right: 0;
    }

    > button {
      height: 100%;
      width: 100%;

      padding: 2px 5px;
      cursor: pointer;
      background-color: transparent;
      border: 1px solid transparent;
      color: #cfd1d2;

      &:hover {
        background-color: #4b4f52;
      }

      + ul {
        display: none;
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-start;
        list-style: none;
        position: absolute;
        top: 100%;
        left: -1px;
        min-width: 150px;
        background-color: #333b3d;
        border-top: none;
        margin: 0;
        padding: 0 0 5px;

        > li {
          width: max-content;
          min-width: 100%;

          &.separator {
            height: 1px;
            width: 100%;
            margin: 5px 0;
            background-color: #6b6b71;
          }

          > button {
            width: 100%;
            padding: 2px 5px;
            cursor: pointer;
            background-color: transparent;
            border: 1px solid transparent;
            color: #cfd1d2;
            text-align: left;

            &:hover {
              background-color: #4b4f52;
            }
          }
        }
      }
    }
  }
}
</style>