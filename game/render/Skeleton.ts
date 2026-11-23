import { SKELETON } from "../constants";
import { DEG2RAD } from "../core/math";
import type { Facing, Joints, Pose, Vec2 } from "../types";

function vec(): Vec2 {
  return { x: 0, y: 0 };
}

/**
 * Skeleton stickman. Posisi sendi dihitung dengan forward kinematics dari sudut tiap tulang (GDD Bagian 8.1).
 * Objek dipakai ulang tiap frame, tidak ada alokasi di dalam loop.
 */
export class Skeleton {
  readonly joints: Joints = {
    head: vec(),
    neck: vec(),
    hip: vec(),
    shoulder: vec(),
    elbowL: vec(),
    elbowR: vec(),
    handL: vec(),
    handR: vec(),
    kneeL: vec(),
    kneeR: vec(),
    footL: vec(),
    footR: vec(),
  };

  /** Vektor satuan "atas kepala" dan "arah depan wajah", dipakai untuk menggambar ikat kepala. */
  headUp: Vec2 = vec();
  headForward: Vec2 = vec();

  /**
   * Menghitung ulang semua sendi.
   * @param originX posisi x tengah badan (pinggul)
   * @param groundY garis tanah: kaki yang paling rendah selalu menyentuh garis ini,
   *                sehingga pinggul otomatis naik turun mengikuti pose (jongkok, melangkah).
   */
  update(pose: Pose, facing: Facing, originX: number, groundY: number): void {
    const j = this.joints;

    j.hip.x = 0;
    j.hip.y = 0;

    // Torso: 0 derajat = tegak ke atas, positif = condong ke arah hadap.
    const lean = pose.torsoLean * DEG2RAD;
    const torsoX = Math.sin(lean) * facing;
    const torsoY = -Math.cos(lean);
    j.neck.x = torsoX * SKELETON.torso;
    j.neck.y = torsoY * SKELETON.torso;
    j.shoulder.x = torsoX * (SKELETON.torso - 4);
    j.shoulder.y = torsoY * (SKELETON.torso - 4);

    // Kepala
    const headAngle = (pose.torsoLean + pose.headTilt) * DEG2RAD;
    this.headUp.x = Math.sin(headAngle) * facing;
    this.headUp.y = -Math.cos(headAngle);
    this.headForward.x = Math.cos(headAngle) * facing;
    this.headForward.y = Math.sin(headAngle);
    const headDistance = SKELETON.headRadius + 2;
    j.head.x = j.neck.x + this.headUp.x * headDistance;
    j.head.y = j.neck.y + this.headUp.y * headDistance;

    // Anggota badan: 0 derajat = lurus ke bawah, positif = ke arah hadap.
    this.limb(j.shoulder, pose.armL[0], SKELETON.upperArm, facing, j.elbowL);
    this.limb(j.elbowL, pose.armL[1], SKELETON.lowerArm, facing, j.handL);
    this.limb(j.shoulder, pose.armR[0], SKELETON.upperArm, facing, j.elbowR);
    this.limb(j.elbowR, pose.armR[1], SKELETON.lowerArm, facing, j.handR);
    this.limb(j.hip, pose.legL[0], SKELETON.thigh, facing, j.kneeL);
    this.limb(j.kneeL, pose.legL[1], SKELETON.calf, facing, j.footL);
    this.limb(j.hip, pose.legR[0], SKELETON.thigh, facing, j.kneeR);
    this.limb(j.kneeR, pose.legR[1], SKELETON.calf, facing, j.footR);

    // Letakkan di dunia: kaki terendah tepat di groundY.
    const lowestFoot = Math.max(j.footL.y, j.footR.y);
    const shiftY = groundY - lowestFoot;
    for (const joint of Object.values(j)) {
      joint.x += originX;
      joint.y += shiftY;
    }
  }

  private limb(from: Vec2, angleDeg: number, length: number, facing: Facing, out: Vec2): void {
    const a = angleDeg * DEG2RAD;
    out.x = from.x + Math.sin(a) * length * facing;
    out.y = from.y + Math.cos(a) * length;
  }
}
