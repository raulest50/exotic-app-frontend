import { useState } from "react";
import { Box, Button, Field, Flex, HStack, Input, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

interface Props {
    fechaDesde: string;
    fechaHasta: string;
    fechasExcluidas: string[];
    diasConDispensacion: string[];
    disabled: boolean;
    onChange: (fechas: string[]) => void;
}

function diasDelRango(desde: string, hasta: string): string[] {
    const inicio = Date.parse(`${desde}T00:00:00Z`);
    const fin = Date.parse(`${hasta}T00:00:00Z`);
    const cantidad = Math.floor((fin - inicio) / 86400000) + 1;
    if (!Number.isFinite(cantidad) || cantidad < 1 || cantidad > 3660) return [];
    return Array.from({ length: cantidad }, (_, i) => new Date(inicio + i * 86400000).toISOString().slice(0, 10));
}

export default function CalendarioDiasReorden({ fechaDesde, fechaHasta, fechasExcluidas, diasConDispensacion, disabled, onChange }: Props) {
    const [mesElegido, setMesElegido] = useState(fechaHasta.slice(0, 7));
    const [intervaloDesde, setIntervaloDesde] = useState(fechaDesde);
    const [intervaloHasta, setIntervaloHasta] = useState(fechaHasta);
    const dias = diasDelRango(fechaDesde, fechaHasta);
    const mesMinimo = fechaDesde.slice(0, 7);
    const mesMaximo = fechaHasta.slice(0, 7);
    const mes = /^\d{4}-\d{2}$/.test(mesElegido) && mesElegido >= mesMinimo && mesElegido <= mesMaximo ? mesElegido : mesMaximo;
    const [anio, numeroMes] = (/^\d{4}-\d{2}$/.test(mes) ? mes : "2000-01").split("-").map(Number);
    const offset = (new Date(Date.UTC(anio, numeroMes - 1, 1)).getUTCDay() + 6) % 7;
    const cantidadDias = new Date(Date.UTC(anio, numeroMes, 0)).getUTCDate();
    const excluidos = new Set(fechasExcluidas);
    const activos = new Set(diasConDispensacion);
    const seleccionados = dias.filter((dia) => !excluidos.has(dia));
    const activosSeleccionados = seleccionados.filter((dia) => activos.has(dia)).length;
    const intervaloValido = intervaloDesde >= fechaDesde && intervaloHasta <= fechaHasta && intervaloDesde <= intervaloHasta && Boolean(intervaloDesde && intervaloHasta);

    const moverMes = (delta: number) => setMesElegido(new Date(Date.UTC(anio, numeroMes - 1 + delta, 1)).toISOString().slice(0, 7));
    const alternar = (dia: string) => {
        const siguientes = new Set(excluidos);
        if (siguientes.has(dia)) siguientes.delete(dia);
        else siguientes.add(dia);
        onChange([...siguientes].sort());
    };
    const aplicarIntervalo = (incluir: boolean) => {
        if (!intervaloValido) return;
        const siguientes = new Set(excluidos);
        diasDelRango(intervaloDesde, intervaloHasta).forEach((dia) => {
            if (incluir) siguientes.delete(dia);
            else siguientes.add(dia);
        });
        onChange([...siguientes].sort());
    };

    return (
        <VStack align="stretch" gap={3}>
            <Text fontSize="sm">Cada día seleccionado está incluido en el análisis. Pulse un día para excluirlo; vuelva a pulsarlo para recuperarlo. La marca «D» indica una fecha con dispensación en el último cálculo.</Text>
            <HStack justify="space-between">
                <Button aria-label="Mes anterior" variant="outline" size="sm" disabled={disabled || mes <= mesMinimo || dias.length === 0} onClick={() => moverMes(-1)}><LuChevronLeft /></Button>
                <Field.Root disabled={disabled} maxW="200px">
                    <Field.Label>Mes del calendario</Field.Label>
                    <Input type="month" min={mesMinimo} max={mesMaximo} value={mes} onChange={(e) => setMesElegido(e.target.value)} />
                </Field.Root>
                <Button aria-label="Mes siguiente" variant="outline" size="sm" disabled={disabled || mes >= mesMaximo || dias.length === 0} onClick={() => moverMes(1)}><LuChevronRight /></Button>
            </HStack>
            <SimpleGrid columns={7} gap={1} aria-label={`Días incluidos de ${mes}`} role="group">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((nombre) => <Text key={nombre} textAlign="center" fontSize="xs">{nombre}</Text>)}
                {Array.from({ length: offset }, (_, index) => <Box key={`vacio-${index}`} />)}
                {Array.from({ length: cantidadDias }, (_, index) => {
                    const dia = new Date(Date.UTC(anio, numeroMes - 1, index + 1)).toISOString().slice(0, 10);
                    const incluido = !excluidos.has(dia);
                    const disponible = dias.length > 0 && dia >= fechaDesde && dia <= fechaHasta;
                    return <Button key={dia} size="sm" px={0} minW={0} variant={incluido && disponible ? "solid" : "outline"} colorPalette={incluido ? "teal" : "gray"}
                        disabled={disabled || !disponible} aria-label={`${dia}${activos.has(dia) ? ", con dispensación" : ""}, ${!disponible ? "fuera del rango" : incluido ? "incluido" : "excluido"}`}
                        aria-pressed={disponible && incluido} onClick={() => alternar(dia)}>
                        {index + 1}{activos.has(dia) ? " D" : ""}
                    </Button>;
                })}
            </SimpleGrid>
            <Flex gap={2} flexWrap="wrap">
                <Button size="sm" variant="outline" disabled={disabled || dias.length === 0} onClick={() => onChange([])}>Seleccionar todo el rango</Button>
                <Button size="sm" variant="outline" disabled={disabled || dias.length === 0} onClick={() => onChange(dias)}>Deseleccionar todo</Button>
            </Flex>
            <SimpleGrid columns={{ base: 1, sm: 2 }} gap={2}>
                <Field.Root disabled={disabled}><Field.Label>Inicio del intervalo</Field.Label><Input type="date" min={fechaDesde} max={fechaHasta} value={intervaloDesde} onChange={(e) => setIntervaloDesde(e.target.value)} /></Field.Root>
                <Field.Root disabled={disabled}><Field.Label>Fin del intervalo</Field.Label><Input type="date" min={fechaDesde} max={fechaHasta} value={intervaloHasta} onChange={(e) => setIntervaloHasta(e.target.value)} /></Field.Root>
            </SimpleGrid>
            <Flex gap={2} flexWrap="wrap">
                <Button size="sm" variant="outline" disabled={disabled || !intervaloValido} onClick={() => aplicarIntervalo(true)}>Incluir intervalo</Button>
                <Button size="sm" variant="outline" disabled={disabled || !intervaloValido} onClick={() => aplicarIntervalo(false)}>Excluir intervalo</Button>
            </Flex>
            <Text fontSize="sm" aria-live="polite">Seleccionados: {seleccionados.length} días calendario. Con dispensación: {activosSeleccionados}. Excluidos: {fechasExcluidas.length}.</Text>
            <Text fontSize="xs" color="app.textSubtle" overflowWrap="anywhere">Fechas excluidas: {fechasExcluidas.length ? fechasExcluidas.join(", ") : "Ninguna"}.</Text>
        </VStack>
    );
}
