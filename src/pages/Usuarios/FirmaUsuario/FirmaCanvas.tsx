import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { FirmaVisualSeleccionada } from "./firmaUsuario.types";
import { canvasToPngFile } from "./firmaCanvasUtils";

interface FirmaCanvasProps {
    disabled?: boolean;
    onChange: (firma: FirmaVisualSeleccionada | null) => void;
    onError: (message: string) => void;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 300;

export default function FirmaCanvas({ disabled = false, onChange, onError }: FirmaCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawingRef = useRef(false);
    const hasStrokeRef = useRef(false);
    const exportRevisionRef = useRef(0);
    const [hasStroke, setHasStroke] = useState(false);

    const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        const canvas = event.currentTarget;
        const rect = canvas.getBoundingClientRect();
        return {
            x: (event.clientX - rect.left) * (canvas.width / rect.width),
            y: (event.clientY - rect.top) * (canvas.height / rect.height),
        };
    };

    const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (disabled) return;
        const context = event.currentTarget.getContext("2d");
        if (!context) return;

        const point = pointFromEvent(event);
        event.currentTarget.setPointerCapture(event.pointerId);
        drawingRef.current = true;
        context.strokeStyle = "#111827";
        context.lineWidth = 5;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.beginPath();
        context.moveTo(point.x, point.y);
        context.lineTo(point.x + 0.01, point.y);
        context.stroke();
        hasStrokeRef.current = true;
        setHasStroke(true);
    };

    const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current || disabled) return;
        const context = event.currentTarget.getContext("2d");
        if (!context) return;
        const point = pointFromEvent(event);
        context.lineTo(point.x, point.y);
        context.stroke();
    };

    const exportCanvas = useCallback(async () => {
        const canvas = canvasRef.current;
        if (!canvas || !hasStrokeRef.current) {
            onChange(null);
            return;
        }
        try {
            const exportRevision = ++exportRevisionRef.current;
            const file = await canvasToPngFile(canvas);
            if (exportRevision !== exportRevisionRef.current) return;
            onChange({
                file,
                dataUrl: canvas.toDataURL("image/png"),
                anchoPx: canvas.width,
                altoPx: canvas.height,
            });
        } catch (error) {
            onError(error instanceof Error ? error.message : "No se pudo preparar la firma dibujada.");
        }
    }, [onChange, onError]);

    const handlePointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current) return;
        drawingRef.current = false;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }
        void exportCanvas();
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
        drawingRef.current = false;
        hasStrokeRef.current = false;
        exportRevisionRef.current += 1;
        setHasStroke(false);
        onChange(null);
    };

    return (
        <Box>
            <Text fontSize="sm" mb={2} color="app.textMuted">
                Dibuje dentro del recuadro usando mouse, lápiz o pantalla táctil.
            </Text>
            <Box
                borderWidth="1px"
                borderRadius="md"
                bg="white"
                overflow="hidden"
                opacity={disabled ? 0.6 : 1}
            >
                <canvas
                    ref={canvasRef}
                    width={CANVAS_WIDTH}
                    height={CANVAS_HEIGHT}
                    aria-label="Área para dibujar la firma visual"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerEnd}
                    onPointerCancel={handlePointerEnd}
                    style={{
                        display: "block",
                        width: "100%",
                        height: "auto",
                        cursor: disabled ? "not-allowed" : "crosshair",
                        touchAction: "none",
                    }}
                />
            </Box>
            <HStack justify="flex-end" mt={2}>
                <Button size="sm" variant="outline" onClick={clearCanvas} disabled={disabled || !hasStroke}>
                    Limpiar dibujo
                </Button>
            </HStack>
        </Box>
    );
}
