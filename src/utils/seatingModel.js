// Furniture is placed in room coordinates (width, depth, height) before projection.
// Every face carries an outward normal, so the projector can light it against a fixed
// world light. That is what turns flat polygons into surfaces that read as a room.

const LIGHT = unit([-0.42, -0.52, 0.78]);
const AMBIENT = 0.52;
const SHADOW = { color: '#312c24', opacity: 0.15 };

export const PALETTE = {
  floor: '#ece5d4',
  stage: '#3d4858',
  screen: '#dbe7f0',
  chairFrame: '#6b7378',
  chairSeat: '#3a7d76',
  chairBack: '#49938a',
  deskLeg: '#8b9298',
  deskTop: '#dcbe95',
  paper: '#fdfcf8',
  pedestal: '#9a8c7c',
  linen: '#fdfaf4',
  plate: '#ffffff',
  cutlery: '#b4babd',
  centrepiece: '#4d8465',
};

// The projector screen reads as a light source rather than a lit surface, so it
// keeps its colour whichever way the room is turned.
const UNLIT = new Set([PALETTE.screen]);

function unit(v) {
  const length = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

// Lambert shading, normalised so a surface pointing straight up keeps its colour
// exactly as written in the palette and only the vertical sides darken. A face
// turned away from the light falls back to ambient, so nothing goes to black.
function shade(hex, normal) {
  const lambert = Math.max(0, normal[0]*LIGHT[0] + normal[1]*LIGHT[1] + normal[2]*LIGHT[2]);
  const level = Math.min(1, AMBIENT + (1 - AMBIENT) * (lambert / LIGHT[2]));
  const packed = parseInt(hex.slice(1), 16);
  return '#' + [16, 8, 0].map(shift =>
    Math.round(Math.min(255, ((packed >> shift) & 255) * level)).toString(16).padStart(2, '0')
  ).join('');
}

export function seatingModel(layout, seatsPerTable) {
  // CABARET spreads seats across an arc, so it needs at least two to divide by.
  const places = Number.isInteger(seatsPerTable) && seatsPerTable > 1
    ? seatsPerTable
    : layout === 'CABARET' ? 5 : 8;
  const faces = [];
  let centre = [0, 0, 0];
  let part = 0;

  function ring(x, y, r, segments) {
    return Array.from({ length: segments }, (_, i) => {
      const angle = i * 2 * Math.PI / segments;
      return [x + r * Math.cos(angle), y + r * Math.sin(angle)];
    });
  }

  function rect(x, y, w, d, rotation) {
    const c = Math.cos(rotation), s = Math.sin(rotation);
    return [[-w,-d],[w,-d],[w,d],[-w,d]].map(([a,b]) => [x+(a*c-b*s)/2, y+(a*s+b*c)/2]);
  }

  function prism(outline, base, height, color, layer = 1) {
    part++;
    const mine = part;
    const topFace = outline.map(([x,y]) => [x, y, base + height]);
    outline.forEach(([x,y], index) => {
      const next = (index + 1) % outline.length;
      const [nx,ny] = outline[next];
      const dx = nx - x, dy = ny - y;
      const length = Math.hypot(dx, dy) || 1;
      faces.push({ vertices: [[x,y,base],[nx,ny,base],topFace[next],topFace[index]],
        normal: [dy/length, -dx/length, 0], color, layer, centre, part: mine });
    });
    faces.push({ vertices: topFace, normal: [0,0,1], color, layer, centre, part: mine });
  }

  function box(x, y, w, d, base, height, color, rotation = 0, layer = 1) {
    prism(rect(x, y, w, d, rotation), base, height, color, layer);
  }

  function disc(x, y, r, base, height, color, segments = 12) {
    prism(ring(x, y, r, segments), base, height, color);
  }

  // Contact shadows sit just above the floor on their own layer, so furniture
  // looks planted rather than floating.
  function shadow(outline) {
    part++;
    faces.push({ vertices: outline.map(([x,y]) => [x, y, 0.014]), normal: [0,0,1],
      color: SHADOW.color, opacity: SHADOW.opacity, layer: 0.5, centre, part });
  }

  function chair(x, y, rotation = 0) {
    centre = [x, y, 0];
    shadow(rect(x, y, 0.68, 0.64, rotation));
    for (const side of [-0.19, 0.19]) {
      box(x + side*Math.cos(rotation), y + side*Math.sin(rotation),
        0.058, 0.4, 0, 0.36, PALETTE.chairFrame, rotation);
    }
    box(x, y, 0.57, 0.54, 0.35, 0.12, PALETTE.chairSeat, rotation);
    box(x - 0.24*Math.sin(rotation), y + 0.24*Math.cos(rotation),
      0.54, 0.09, 0.44, 0.43, PALETTE.chairBack, rotation);
  }

  function desk(x, y, w, d) {
    centre = [x, y, 0];
    shadow(rect(x, y, w * 1.03, d * 1.05, 0));
    for (const side of [-1, 1]) box(x + w*0.34*side, y, 0.12, d*0.76, 0, 0.65, PALETTE.deskLeg);
    box(x, y, w, d, 0.65, 0.10, PALETTE.deskTop);
  }

  box(0, 0, 13, 11, -0.24, 0.24, PALETTE.floor, 0, 0);
  centre = [0, -4.47, 0];
  box(0, -4.47, 6.8, 1.25, 0, 0.32, PALETTE.stage);
  box(0, -4.99, 3.7, 0.1, 0.32, 1.55, PALETTE.screen);

  if (layout === 'THEATRE' || layout === 'CLASSROOM') {
    for (const y of [-2.25, -0.55, 1.15, 2.85]) {
      for (const x of [-4.55, -3.35, -2.15, 2.15, 3.35, 4.55]) chair(x, y + 0.4);
      if (layout === 'CLASSROOM') for (const x of [-3.35, 3.35]) {
        desk(x, y - 0.3, 3.6, 0.7);
        for (const offset of [-1.2, 0, 1.2]) {
          box(x + offset, y - 0.3, 0.37, 0.28, 0.75, 0.02, PALETTE.paper);
        }
      }
    }
  } else if (layout === 'BANQUET' || layout === 'CABARET') {
    for (const y of [-1.65, 1.95]) for (const x of [-3.6, 0, 3.6]) {
      centre = [x, y, 0];
      shadow(ring(x, y, 1.24, 20));
      disc(x, y, 0.36, 0, 0.68, PALETTE.pedestal);
      disc(x, y, 1.09, 0.61, 0.16, PALETTE.linen, 28);
      const angles = Array.from({ length: places }, (_, i) => layout === 'CABARET'
        ? -94 + i*188/(places - 1) : i*360/places);
      for (const deg of angles) {
        const a = deg * Math.PI / 180;
        const px = x - 0.78*Math.sin(a), py = y + 0.78*Math.cos(a);
        disc(px, py, 0.165, 0.77, 0.025, PALETTE.plate);
        box(px, py, 0.083, 0.17, 0.795, 0.012, PALETTE.cutlery, a);
      }
      disc(x, y, 0.15, 0.77, 0.14, PALETTE.centrepiece);
      for (const deg of angles) {
        const a = deg * Math.PI / 180;
        chair(x - 1.39*Math.sin(a), y + 1.39*Math.cos(a), a);
      }
    }
  } else if (layout === 'BOARDROOM') {
    desk(0, 0.35, 3.6, 6.5);
    for (const y of [-2, -0.5, 1, 2.5]) { chair(-2.35, y, Math.PI/2); chair(2.35, y, -Math.PI/2); }
    chair(0, -3.45, Math.PI); chair(0, 4.15);
  } else if (layout === 'U_SHAPE') {
    for (const x of [-3.5, 3.5]) {
      desk(x, 0, 1.15, 6);
      for (const y of [-2, -0.6, 0.8, 2.2]) {
        chair(x + Math.sign(x)*0.95, y, -Math.sign(x)*Math.PI/2);
      }
    }
    desk(0, 3.2, 8.15, 1);
    for (const x of [-2.8, -1.4, 0, 1.4, 2.8]) chair(x, 4.15);
  }
  return faces;
}

export function projectRoom(model, degrees, overhead) {
  const yaw = degrees*Math.PI/180, tilt = overhead ? Math.PI/2 : 0.62;
  function project([x,y,z]) {
    const depth = x*Math.sin(yaw) + y*Math.cos(yaw);
    return [(x*Math.cos(yaw) - y*Math.sin(yaw))*24,
      (depth*Math.sin(tilt) - z*Math.cos(tilt))*24, depth*Math.cos(tilt) + z*Math.sin(tilt)];
  }
  const faces = model.map(face => {
    const vertices = face.vertices.map(project);
    // Back faces are hidden. Draw each item's support before its top so a
    // pedestal never shows through the tabletop when the camera turns.
    const [a,b,c] = vertices;
    const visible = (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]) > 0.0001;
    return { ...face, visible, depth: project(face.centre)[2],
      fill: face.opacity || UNLIT.has(face.color) ? face.color : shade(face.color, face.normal),
      points: vertices.map(p => p.slice(0,2).map(n => n.toFixed(2)).join(',')).join(' ') };
  }).filter(face => face.visible).sort((a,b) => a.layer-b.layer || a.depth-b.depth || a.part-b.part);
  return { faces, stage: project([0,-4.47,0.34]), viewBox: overhead ? '-215 -215 430 430' : '-213 -138 426 276' };
}