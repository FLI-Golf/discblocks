import { it } from 'vitest';
import * as THREE from 'three';
import * as fs from 'fs';
import { Golfer, DEFAULT_GOLFER_APPEARANCE, BODY_PROFILES } from '@/rendering/Golfer';
import { GolferPoseTarget } from '@/rendering/avatar';
const mk = () =>
  new Golfer({ ...DEFAULT_GOLFER_APPEARANCE, profile: { ...BODY_PROFILES.neutralLean } });
it('cal', () => {
  const d = THREE.MathUtils.degToRad;
  const lines: string[] = [];
  [0, 45, 90, 120, 140].forEach((deg) => {
    const g = mk();
    g.applyPoseBaseline();
    new GolferPoseTarget(g).applyPose({
      id: 't',
      name: 't',
      leftShoulder: { abduction: d(deg) },
      rightShoulder: { abduction: d(deg) },
    });
    g.root.updateMatrixWorld(true);
    const res = (side: 'left' | 'right') => {
      const sh = g
        .getJointGroup((side === 'left' ? 'shoulderL' : 'shoulderR') as any)!
        .getWorldPosition(new THREE.Vector3());
      const el = g
        .getJointGroup((side === 'left' ? 'elbowL' : 'elbowR') as any)!
        .getWorldPosition(new THREE.Vector3());
      const dd = el.clone().sub(sh);
      return (Math.atan2(-dd.y, Math.abs(dd.x)) * 180) / Math.PI; // deg below horizontal (negative = above)
    };
    lines.push(
      'ABD=' +
        deg +
        ' L_belowHoriz=' +
        res('left').toFixed(1) +
        ' R_belowHoriz=' +
        res('right').toFixed(1)
    );
    g.dispose();
  });
  fs.writeFileSync('/tmp/cal.txt', lines.join('\n'));
});
