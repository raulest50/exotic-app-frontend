import { useToast } from "@chakra-ui/react";
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import EndPointsURL from "../../../api/EndPointsURL";
import {
    CargaMasivaCostosApi,
    cargaCostosErrorMessage,
    readCargaCostosError,
} from "./cargaMasivaCostosApi";
import {
    CargaCostosConfirmacion,
    CargaCostosErrorFila,
    CargaCostosItemsPage,
    CargaCostosPreparacion,
    CargaCostosToken,
} from "./types";

export const CARGA_COSTOS_PAGE_SIZE = 25;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export function useCargaMasivaCostos(onBackToSelector: () => void) {
    const toast = useToast();
    const api = useMemo(() => new CargaMasivaCostosApi(new EndPointsURL()), []);
    const [activeStep, setActiveStep] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [motivo, setMotivo] = useState("");
    const [preparacion, setPreparacion] = useState<CargaCostosPreparacion | null>(null);
    const [itemsPage, setItemsPage] = useState<CargaCostosItemsPage | null>(null);
    const [validationErrors, setValidationErrors] = useState<CargaCostosErrorFila[]>([]);
    const [tokenData, setTokenData] = useState<CargaCostosToken | null>(null);
    const [typedToken, setTypedToken] = useState("");
    const [intentosRestantes, setIntentosRestantes] = useState<number | null>(null);
    const [blocked, setBlocked] = useState(false);
    const [result, setResult] = useState<CargaCostosConfirmacion | null>(null);
    const [busy, setBusy] = useState(false);
    const [loadingItems, setLoadingItems] = useState(false);
    const [now, setNow] = useState(Date.now());

    const resetLocal = useCallback(() => {
        setActiveStep(0);
        setFile(null);
        setFileInputKey((current) => current + 1);
        setMotivo("");
        setPreparacion(null);
        setItemsPage(null);
        setValidationErrors([]);
        setTokenData(null);
        setTypedToken("");
        setIntentosRestantes(null);
        setBlocked(false);
        setResult(null);
    }, []);

    useEffect(() => {
        if (!tokenData || result) return;
        setNow(Date.now());
        const intervalId = window.setInterval(() => setNow(Date.now()), 1_000);
        return () => window.clearInterval(intervalId);
    }, [tokenData, result]);

    useEffect(() => {
        if (!preparacion || result) return;
        const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warnBeforeLeaving);
        return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
    }, [preparacion, result]);

    const seleccionarArchivo = (event: ChangeEvent<HTMLInputElement>) => {
        const selected = event.target.files?.[0] ?? null;
        if (selected && !selected.name.toLowerCase().endsWith(".xlsx")) {
            toast({
                title: "Archivo no permitido",
                description: "Seleccione un archivo con extension .xlsx.",
                status: "error",
                isClosable: true,
            });
            event.target.value = "";
            return;
        }
        if (selected && selected.size > MAX_FILE_SIZE_BYTES) {
            toast({
                title: "Archivo demasiado grande",
                description: "El tamano maximo permitido es 10 MB.",
                status: "error",
                isClosable: true,
            });
            event.target.value = "";
            return;
        }
        setFile(selected);
        setValidationErrors([]);
    };

    const cargarPagina = useCallback(async (loteId: string, page: number) => {
        setLoadingItems(true);
        try {
            setItemsPage(await api.listarItems(loteId, page, CARGA_COSTOS_PAGE_SIZE));
        } catch (error) {
            toast({
                title: "No fue posible consultar el detalle",
                description: cargaCostosErrorMessage(error),
                status: "error",
                duration: 7_000,
                isClosable: true,
            });
        } finally {
            setLoadingItems(false);
        }
    }, [api, toast]);

    const preparar = async () => {
        const motivoLimpio = motivo.trim();
        if (!file || !motivoLimpio) return;
        setBusy(true);
        setValidationErrors([]);
        try {
            const nuevaPreparacion = await api.preparar(file, motivoLimpio);
            setPreparacion(nuevaPreparacion);
            setActiveStep(1);
            await cargarPagina(nuevaPreparacion.loteId, 0);
            toast({
                title: "Archivo validado",
                description: `${nuevaPreparacion.totalCandidatas} materiales preparados.`,
                status: "success",
                isClosable: true,
            });
        } catch (error) {
            const response = readCargaCostosError(error);
            setValidationErrors(response?.errores ?? []);
            toast({
                title: "No fue posible preparar la carga",
                description: cargaCostosErrorMessage(error),
                status: "error",
                duration: 7_000,
                isClosable: true,
            });
        } finally {
            setBusy(false);
        }
    };

    const generarToken = async () => {
        if (!preparacion) return;
        setBusy(true);
        try {
            const token = await api.generarToken(preparacion.loteId);
            setTokenData(token);
            setIntentosRestantes(token.intentosPermitidos);
            setTypedToken("");
            setNow(Date.now());
            setActiveStep(2);
        } catch (error) {
            toast({
                title: "No fue posible generar el token",
                description: cargaCostosErrorMessage(error),
                status: "error",
                duration: 7_000,
                isClosable: true,
            });
        } finally {
            setBusy(false);
        }
    };

    const irAConfirmacion = async () => {
        if (tokenData && Date.parse(tokenData.expiraEn) > Date.now()) {
            setActiveStep(2);
            return;
        }
        await generarToken();
    };

    const confirmar = async () => {
        if (!preparacion || !tokenData || typedToken.length !== 4 || blocked) return;
        setBusy(true);
        try {
            const confirmation = await api.confirmar(preparacion.loteId, typedToken);
            setResult(confirmation);
            setTokenData(null);
            setTypedToken("");
            toast({
                title: "Costos actualizados",
                description: confirmation.mensaje,
                status: "success",
                duration: 6_000,
                isClosable: true,
            });
        } catch (error) {
            const response = readCargaCostosError(error);
            const remainingAttempts = response?.intentosRestantes;
            if (remainingAttempts !== null && remainingAttempts !== undefined) {
                setIntentosRestantes(remainingAttempts);
            }
            if (response?.codigo === "PREPARACION_BLOQUEADA") {
                setBlocked(true);
                setTokenData(null);
                setTypedToken("");
            }
            toast({
                title: response?.codigo === "TOKEN_INCORRECTO"
                    ? "Token incorrecto"
                    : "No se ejecutaron cambios",
                description: response && remainingAttempts !== null && remainingAttempts !== undefined
                    ? `${response.mensaje}. Intentos restantes: ${remainingAttempts}.`
                    : cargaCostosErrorMessage(error),
                status: "error",
                duration: 7_000,
                isClosable: true,
            });
        } finally {
            setBusy(false);
        }
    };

    const cancelarPreparacion = async (): Promise<boolean> => {
        if (!preparacion || result) return true;
        setBusy(true);
        try {
            await api.cancelar(preparacion.loteId);
            return true;
        } catch (error) {
            if (readCargaCostosError(error)?.codigo === "PREPARACION_NO_ENCONTRADA") {
                return true;
            }
            toast({
                title: "No fue posible cancelar la preparacion",
                description: cargaCostosErrorMessage(error),
                status: "error",
                duration: 7_000,
                isClosable: true,
            });
            return false;
        } finally {
            setBusy(false);
        }
    };

    const cancelarYNuevaCarga = async () => {
        if (await cancelarPreparacion()) resetLocal();
    };

    const cambiarPagina = async (page: number) => {
        if (preparacion) await cargarPagina(preparacion.loteId, page);
    };

    const volverAlSelector = async () => {
        if (preparacion && !result
            && !window.confirm("La preparacion actual sera cancelada. Desea volver?")) {
            return;
        }
        if (!(await cancelarPreparacion())) return;
        resetLocal();
        onBackToSelector();
    };

    const tokenSecondsRemaining = tokenData
        ? Math.max(0, Math.ceil((Date.parse(tokenData.expiraEn) - now) / 1_000))
        : 0;

    return {
        activeStep,
        file,
        fileInputKey,
        motivo,
        preparacion,
        itemsPage,
        validationErrors,
        tokenData,
        typedToken,
        intentosRestantes,
        blocked,
        result,
        busy,
        loadingItems,
        tokenSecondsRemaining,
        seleccionarArchivo,
        setMotivo,
        setTypedToken,
        preparar,
        cambiarPagina,
        irAConfirmacion,
        generarToken,
        confirmar,
        cancelarYNuevaCarga,
        volverAlSelector,
        volverAPrevisualizacion: () => setActiveStep(1),
        nuevaCarga: resetLocal,
    };
}
