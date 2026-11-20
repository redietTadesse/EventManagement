// Furniture is placed in room coordinates (width, depth, height) before projection.
export function seatingModel(layout, seatsPerTable = layout === 'CABARET' ? 5 : 8) {
  const faces = [];
  let centre = [0,0,0];
  let part = 0;
  function prism(outline, base, height, top, side, layer = 1) {
    part++;
    const topFace = outline.map(([x,y]) => [x,y,base + height]);
    outline.forEach(([x,y], index) => {
      const [nx,ny] = outline[(index + 1) % outline.length];
      faces.push({ vertices: [[x,y,base],[nx,ny,base],topFace[(index+1)%outline.length],topFace[index]], color: side, layer, centre, part });
    });
    faces.push({ vertices: topFace, color: top, layer, centre, part });
  }
  function box(x,y,w,d,base,height,top,side,rotation=0,layer=1) {
    const c = Math.cos(rotation), s = Math.sin(rotation);
    const outline = [[-w,-d],[w,-d],[w,d],[-w,d]].map(([a,b]) => [x+(a*c-b*s)/2,y+(a*s+b*c)/2]);
    prism(outline,base,height,top,side,layer);
  }
  function chair(x,y,rotation=0) {
    centre = [x,y,0];
    for (const side of [-.19,.19]) {
      box(x+side*Math.cos(rotation),y+side*Math.sin(rotation),.058,.4,0,.36,'#888786','#575e5b',rotation);
    }
    box(x,y,.57,.54,.35,.12,'#648886','#365f61',rotation);
    box(x-.24*Math.sin(rotation),y+.24*Math.cos(rotation),.54,.09,.44,.43,'#82aaa1','#4e7978',rotation);
  }
  function desk(x,y,w,d) {
    centre = [x,y,0];
    for (const side of [-1,1]) box(x+w*.34*side,y,.12,d*.76,0,.65,'#a79884','#726859');
    box(x,y,w,d,.65,.10,'#e4bf96','#af865f');
  }
  function disc(x,y,r,base,height,top,side,segments=12) {
    const outline = Array.from({length:segments}, (_,i) => {
      const angle = i*2*Math.PI/segments;
      return [x+r*Math.cos(angle), y+r*Math.sin(angle)];
    });
    prism(outline,base,height,top,side);
  }
  box(0,0,13,11,-.24,.24,'#e9dfca','#ae9982',0,0);
  centre = [0,-4.47,0];
  box(0,-4.47,6.8,1.25,0,.32,'#536171','#344556');
  box(0,-4.99,3.7,.1,.32,1.55,'#eef1ee','#c4d2d3');
  if (layout === 'THEATRE' || layout === 'CLASSROOM') {
    for (const y of [-2.25,-.55,1.15,2.85]) {
      for (const x of [-4.55,-3.35,-2.15,2.15,3.35,4.55]) chair(x,y+.4);
      if (layout === 'CLASSROOM') for (const x of [-3.35,3.35]) {
        desk(x,y-.3,3.6,.7);
        for (const offset of [-1.2,0,1.2]) box(x+offset,y-.3,.37,.28,.75,.02,'#faf8ef','#b8b5aa');
      }
    }
  } else if (layout === 'BANQUET' || layout === 'CABARET') {
    for (const y of [-1.65,1.95]) for (const x of [-3.6,0,3.6]) {
      centre = [x,y,0];
      disc(x,y,.36,0,.68,'#977852','#8c7154');
      disc(x,y,1.09,.61,.16,'#fbf2e2','#c9bda9',28);
      const angles = Array.from({length:seatsPerTable}, (_,i) => layout === 'CABARET'
        ? -94 + i*188/(seatsPerTable-1) : i*360/seatsPerTable);
      for (const deg of angles) {
        const a = deg*Math.PI/180;
        const px=x-.78*Math.sin(a), py=y+.78*Math.cos(a);
        disc(px,py,.165,.77,.025,'#fdfcfa','#9aaba8');
        box(px,py,.083,.17,.795,.012,'#ba7f67','#a76c54',a);
      }
      disc(x,y,.15,.77,.14,'#507669','#405d55');
      for (const deg of angles) {
        const a = deg*Math.PI/180;
        chair(x-1.39*Math.sin(a),y+1.39*Math.cos(a),a);
      }
    }
  } else if (layout === 'BOARDROOM') {
    desk(0,.35,3.6,6.5);
    for (const y of [-2,-.5,1,2.5]) { chair(-2.35,y,Math.PI/2); chair(2.35,y,-Math.PI/2); }
    chair(0,-3.45,Math.PI); chair(0,4.15);
  } else if (layout === 'U_SHAPE') {
    for (const x of [-3.5,3.5]) {
      desk(x,0,1.15,6);
      for (const y of [-2,-.6,.8,2.2]) chair(x+Math.sign(x)*.95,y,-Math.sign(x)*Math.PI/2);
    }
    desk(0,3.2,8.15,1);
    for (const x of [-2.8,-1.4,0,1.4,2.8]) chair(x,4.15);
  }
  return faces;
}

export function projectRoom(model, degrees, overhead) {
  const yaw = degrees*Math.PI/180, tilt = overhead ? Math.PI/2 : .62;
  function project([x,y,z]) {
    const depth = x*Math.sin(yaw)+y*Math.cos(yaw);
    return [(x*Math.cos(yaw)-y*Math.sin(yaw))*24,
      (depth*Math.sin(tilt)-z*Math.cos(tilt))*24, depth*Math.cos(tilt)+z*Math.sin(tilt)];
  }
  const faces = model.map(face => {
    const vertices = face.vertices.map(project);
    // Back faces are hidden. Draw each item's support before its top so a
    // pedestal never shows through the tabletop when the camera turns.
    const [a,b,c] = vertices;
    const visible = (b[0]-a[0])*(c[1]-a[1]) - (b[1]-a[1])*(c[0]-a[0]) > .0001;
    return { ...face, visible, depth: project(face.centre)[2],
      points: vertices.map(p => p.slice(0,2).map(n => n.toFixed(2)).join(',')).join(' ') };
  }).filter(face => face.visible).sort((a,b) => a.layer-b.layer || a.depth-b.depth || a.part-b.part);
  return { faces, stage: project([0,-4.47,.34]), viewBox: overhead ? '-215 -215 430 430' : '-213 -138 426 276' };
}
