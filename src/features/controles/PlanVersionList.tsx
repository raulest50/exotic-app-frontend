import { Badge, Button, HStack, Table, Text, VStack } from "@chakra-ui/react";
import { CONTROL_SCOPE_LABEL, formatControlDate } from "./controlUi";
import { getPlanVersionActions, planVersionDate } from "./planVersionView";
import StatusBadge from "./StatusBadge";
import type { PlanControlResumen, VersionPlanResumen } from "./types";

interface Props {
    plans: PlanControlResumen[];
    nivel: number;
    busy: boolean;
    onDetail: (plan: PlanControlResumen, version: VersionPlanResumen, trigger: HTMLButtonElement) => void;
    onEdit: (plan: PlanControlResumen, version: VersionPlanResumen) => void;
    onPublish: (plan: PlanControlResumen, version: VersionPlanResumen) => void;
    onRetire: (plan: PlanControlResumen, version: VersionPlanResumen) => void;
    onShowDraft: (plan: PlanControlResumen, trigger: HTMLButtonElement) => void;
}

export default function PlanVersionList({ plans, nivel, busy, onDetail, onEdit, onPublish, onRetire, onShowDraft }: Props) {
    return (
        <Table.Root size="sm" minW="880px" aria-label="Planes y versiones de control">
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeader>Versión</Table.ColumnHeader>
                    <Table.ColumnHeader>Estado</Table.ColumnHeader>
                    <Table.ColumnHeader>Fecha</Table.ColumnHeader>
                    <Table.ColumnHeader>Configuración de la versión</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
            </Table.Header>
            {plans.map((plan) => (
                <Table.Body key={plan.id}>
                    <Table.Row bg="bg.subtle">
                        <Table.Cell colSpan={5}>
                            <HStack justify="space-between" gap={3} flexWrap="wrap">
                                <VStack align="start" gap={1}>
                                    <Text fontWeight="semibold">{plan.codigo} · {plan.nombre}</Text>
                                    <Badge size="sm" colorPalette={plan.ambito === "CALIDAD" ? "purple" : "blue"}>
                                        {CONTROL_SCOPE_LABEL[plan.ambito]}
                                    </Badge>
                                </VStack>
                                {plan.borrador && !plan.versiones.some((version) => version.id === plan.borrador?.id) && (
                                    <HStack>
                                        <Text fontSize="xs">Existe un borrador v{plan.borrador.numero}.</Text>
                                        <Button size="xs" variant="outline" disabled={busy} onClick={(event) => onShowDraft(plan, event.currentTarget)}>Ver borrador</Button>
                                    </HStack>
                                )}
                            </HStack>
                        </Table.Cell>
                    </Table.Row>
                    {plan.versiones.map((version) => {
                        const actions = getPlanVersionActions(plan, version.id, nivel);
                        const date = planVersionDate(version);
                        return (
                            <Table.Row key={version.id} aria-label={`${plan.codigo} · versión ${version.numero}`}>
                                <Table.Cell fontWeight="semibold">v{version.numero}</Table.Cell>
                                <Table.Cell><StatusBadge status={version.estado} /></Table.Cell>
                                <Table.Cell>
                                    <Text fontSize="xs" color="fg.muted">{date.label}</Text>
                                    <Text fontSize="sm">{formatControlDate(date.value)}</Text>
                                </Table.Cell>
                                <Table.Cell>
                                    {version.cantidadAplicabilidades} {version.cantidadAplicabilidades === 1 ? "ubicación" : "ubicaciones"}
                                    {" · "}{version.cantidadCaracteristicas} {version.cantidadCaracteristicas === 1 ? "medición" : "mediciones"}
                                </Table.Cell>
                                <Table.Cell>
                                    <HStack justify="flex-end" flexWrap="wrap" gap={2}>
                                        {actions.view && <Button size="xs" variant="outline" disabled={busy} onClick={(event) => onDetail(plan, version, event.currentTarget)}>Ver detalle</Button>}
                                        {actions.edit && <Button size="xs" variant="outline" disabled={busy} onClick={() => onEdit(plan, version)}>Editar borrador</Button>}
                                        {actions.create && <Button size="xs" variant="outline" disabled={busy} onClick={() => onEdit(plan, version)}>Nueva versión</Button>}
                                        {actions.publish && <Button size="xs" colorPalette="teal" disabled={busy} onClick={() => onPublish(plan, version)}>Publicar</Button>}
                                        {actions.retire && <Button size="xs" colorPalette="orange" variant="outline" disabled={busy} onClick={() => onRetire(plan, version)}>Retirar</Button>}
                                    </HStack>
                                </Table.Cell>
                            </Table.Row>
                        );
                    })}
                </Table.Body>
            ))}
        </Table.Root>
    );
}
