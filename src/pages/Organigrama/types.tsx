import type { Node } from "@xyflow/react";

export enum AccessLevel {
  VIEW = 1,
  EDIT = 2,
}

/** Datos editables del cargo. La posición vive únicamente en Node.position. */
export interface Cargo {
  idCargo: string;
  tituloCargo: string;
  descripcionCargo: string;
  departamento: string;
  usuario?: string;
  nivel: number;
  urlDocManualFunciones?: string;
}

export interface OrganigramaNodeData extends Cargo, Record<string, unknown> {
  accessLevel: AccessLevel;
  isMaster: boolean;
  onEdit: (nodeId: string) => void;
  onViewDetails: (nodeId: string) => void;
}

export type OrganigramaNode = Node<OrganigramaNodeData, "positionNode">;

export interface OrganigramaUser {
  id: number;
  username: string;
  nombreCompleto?: string;
}
