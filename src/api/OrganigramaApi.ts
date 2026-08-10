import axios from "axios";
import EndPointsURL from "./EndPointsURL";

const endPoints = new EndPointsURL();

export interface CargoOrganigramaApi {
  idCargo: string;
  tituloCargo: string;
  descripcionCargo: string;
  departamento: string;
  usuario?: string | null;
  posicionX: number;
  posicionY: number;
  nivel: number;
  urlDocManualFunciones?: string | null;
}

export interface RelacionOrganigramaApi {
  jefeId: string;
  subordinadoId: string;
}

export interface OrganigramaSnapshot {
  revision: number;
  actualizadoEn: string;
  actualizadoPor?: string | null;
  cargos: CargoOrganigramaApi[];
  relaciones: RelacionOrganigramaApi[];
}

export interface GuardarOrganigramaPayload {
  baseRevision: number;
  cargos: Array<Omit<CargoOrganigramaApi, "urlDocManualFunciones">>;
  relaciones: RelacionOrganigramaApi[];
}

export async function getOrganigramaSnapshot(): Promise<OrganigramaSnapshot> {
  const response = await axios.get<OrganigramaSnapshot>(endPoints.organigrama_snapshot);
  return response.data;
}

export async function saveOrganigramaSnapshot(
  payload: GuardarOrganigramaPayload,
): Promise<OrganigramaSnapshot> {
  const response = await axios.put<OrganigramaSnapshot>(endPoints.organigrama_snapshot, payload);
  return response.data;
}

export async function uploadManualFunciones(
  cargoId: string,
  file: File,
): Promise<CargoOrganigramaApi> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await axios.put<CargoOrganigramaApi>(
    endPoints.organigrama_manual(cargoId),
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.data;
}

export async function setManualFuncionesUrl(
  cargoId: string,
  url: string,
): Promise<CargoOrganigramaApi> {
  const response = await axios.put<CargoOrganigramaApi>(
    endPoints.organigrama_manual_url(cargoId),
    { url },
  );
  return response.data;
}

export async function clearManualFunciones(cargoId: string): Promise<CargoOrganigramaApi> {
  const response = await axios.delete<CargoOrganigramaApi>(endPoints.organigrama_manual(cargoId));
  return response.data;
}

export async function openManualFunciones(cargo: CargoOrganigramaApi): Promise<void> {
  const location = cargo.urlDocManualFunciones?.trim();
  if (!location) return;

  if (/^https?:\/\//i.test(location)) {
    window.open(location, "_blank", "noopener,noreferrer");
    return;
  }

  const previewWindow = window.open("about:blank", "_blank");
  if (previewWindow) previewWindow.opener = null;
  try {
    const response = await axios.get<Blob>(endPoints.organigrama_manual(cargo.idCargo), {
      responseType: "blob",
    });
    const objectUrl = URL.createObjectURL(response.data);
    if (previewWindow) {
      previewWindow.location.href = objectUrl;
    } else {
      window.open(objectUrl, "_blank", "noopener,noreferrer");
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
}
