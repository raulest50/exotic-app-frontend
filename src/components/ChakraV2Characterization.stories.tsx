import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LuCheck } from 'react-icons/lu';
import {
  Steps,
  Box,
  Button,
  Checkbox,
  Drawer,
  HStack,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Progress,
  NativeSelect,
  SimpleGrid,
  Tab,
  Table,
  TableContainer,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  useDisclosure,
  Portal,
  Field,
  Dialog,
} from '@chakra-ui/react';
import { useAppToast } from "@/components/ui/use-app-toast";

import { Tooltip } from '@/components/ui/tooltip';

const StoryFrame = ({ children, title }: { children: ReactNode; title: string }) => (
  <Box minH="100vh" bg="app.surfaceSubtle" color="chakra-body-text" p={{ base: 4, md: 8 }}>
    <VStack align="stretch" gap={6} maxW="960px" mx="auto">
      <Box>
        <Text as="h1" fontSize="2xl" fontWeight="bold">
          {title}
        </Text>
        <Text color="app.textMuted" fontSize="sm">
          Referencia determinista de la interfaz Chakra UI v2.
        </Text>
      </Box>
      {children}
    </VStack>
  </Box>
);

export const ModalV2 = () => {
  const { open, onClose, onOpen } = useDisclosure({ defaultIsOpen: true });
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <StoryFrame title="Modal v2">
      <Button ref={triggerRef} alignSelf="flex-start" colorPalette="blue" onClick={onOpen}>
        Abrir modal
      </Button>
      <Dialog.Root open={isOpen} finalFocusEl={() => triggerRef.current} placement='center' onOpenChange={e => {
        if (!e.open) {
          onClose();
        }
      }}>
        <Portal>

          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>Confirmar operación</Dialog.Header>
              <Dialog.CloseTrigger />
              <Dialog.Body>
                <Text>La información permanecerá sin cambios hasta confirmar.</Text>
              </Dialog.Body>
              <Dialog.Footer gap={3}>
                <Button variant="ghost" onClick={onClose}>
                  Cancelar
                </Button>
                <Button colorPalette="blue" onClick={onClose}>
                  Confirmar
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>

        </Portal>
      </Dialog.Root>
    </StoryFrame>
  );
};

export const DrawerV2 = () => {
  const { open, onClose, onOpen } = useDisclosure({ defaultIsOpen: true });
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <StoryFrame title="Drawer v2">
      <Button ref={triggerRef} alignSelf="flex-start" colorPalette="teal" onClick={onOpen}>
        Abrir panel
      </Button>
      <Drawer.Root open={isOpen} placement='end' finalFocusEl={() => triggerRef.current} size='sm' onOpenChange={e => {
        if (!e.open) {
          onClose();
        }
      }}>
        <Portal>

          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.CloseTrigger />
              <Drawer.Header borderBottomWidth="1px">Filtros del inventario</Drawer.Header>
              <Drawer.Body>
                <VStack align="stretch" gap={4} pt={2}>
                  <Field.Root>
                    <Field.Label>Estado</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field defaultValue="available">
                        <option value="all">Todos</option>
                        <option value="available">Disponible</option>
                        <option value="reserved">Reservado</option>
                      </NativeSelect.Field>
                      <NativeSelect.Indicator />
                    </NativeSelect.Root>
                  </Field.Root>
                  <Checkbox.Root defaultChecked colorPalette="teal"><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>Incluir existencias bajas
                                    </Checkbox.Label></Checkbox.Root>
                </VStack>
              </Drawer.Body>
              <Drawer.Footer borderTopWidth="1px" gap={3}>
                <Button variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button colorPalette="teal" onClick={onClose}>
                  Aplicar
                </Button>
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer.Positioner>

        </Portal>
      </Drawer.Root>
    </StoryFrame>
  );
};

export const TabsV2 = () => {
  const [tabIndex, setTabIndex] = useState(1);

  return (
    <StoryFrame title="Tabs v2">
      <Tabs.Root
        value={tabIndex}
        onValueChange={setTabIndex}
        colorPalette="blue"
        variant='enclosed'
        lazyMount>
        <Tabs.List overflowX="auto">
          <Tab>Resumen</Tab>
          <Tab>Movimientos</Tab>
          <Tab disabled>Auditoría</Tab>
        </Tabs.List>
        <TabPanels bg="app.surface" borderWidth="1px" borderTopWidth="0">
          <TabPanel>
            <Text>Resumen general del inventario.</Text>
          </TabPanel>
          <TabPanel>
            <VStack align="stretch" gap={2}>
              <Text fontWeight="semibold">Último movimiento</Text>
              <Text color="app.textMuted">Ingreso OCM · 24 unidades · Lote L-001</Text>
            </VStack>
          </TabPanel>
          <TabPanel>
            <Text>Contenido restringido.</Text>
          </TabPanel>
        </TabPanels>
      </Tabs.Root>
    </StoryFrame>
  );
};

export const FormsV2 = () => {
  const [quantity, setQuantity] = useState('12.50');
  const [requiresInspection, setRequiresInspection] = useState(true);

  return (
    <StoryFrame title="Formularios v2">
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={5} bg="app.surface" borderWidth="1px" borderRadius="md" p={6}>
        <Field.Root required>
          <Field.Label>Código de material</Field.Label>
          <Input defaultValue="MAT-001" />
          <Field.HelperText>Identificador interno obligatorio.</Field.HelperText>
        </Field.Root>
        <Field.Root>
          <Field.Label>Tipo de movimiento</Field.Label>
          <NativeSelect.Root>
            <NativeSelect.Field defaultValue="entry">
              <option value="entry">Ingreso</option>
              <option value="dispatch">Dispensación</option>
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field.Root>
        <Field.Root>
          <Field.Label>Cantidad</Field.Label>
          <NumberInput.Root value={String(quantity)} min={0} precision={2} step={0.25} onValueChange={setQuantity}>
            <NumberInput.Input />
            <NumberInput.Control>
              <NumberInput.IncrementTrigger />
              <NumberInput.DecrementTrigger />
            </NumberInput.Control>
          </NumberInput.Root>
        </Field.Root>
        <Field.Root invalid>
          <Field.Label>Lote</Field.Label>
          <Input value="" onValueChange={() => undefined} placeholder="Ej. L-001" />
          <Field.ErrorText>El lote es obligatorio.</Field.ErrorText>
        </Field.Root>
        <Field.Root readOnly>
          <Field.Label>Responsable</Field.Label>
          <Input value="Usuario de prueba" readOnly bg="app.inputReadonly" />
        </Field.Root>
        <Field.Root disabled>
          <Field.Label>Ubicación automática</Field.Label>
          <Input value="Bodega principal" readOnly />
        </Field.Root>
        <Checkbox.Root
          checked={requiresInspection}
          colorPalette="teal"
          onCheckedChange={(event) => setRequiresInspection(event.target.checked)}
        ><Checkbox.HiddenInput /><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Label>Requiere inspección de calidad
                    </Checkbox.Label></Checkbox.Root>
      </SimpleGrid>
    </StoryFrame>
  );
};

const CHARACTERIZATION_TOAST_ID = 'chakra-v2-characterization-toast';

export const ToastV2 = () => {
  const toast = useAppToast();

  const showToast = () => {
    if (toast.isActive(CHARACTERIZATION_TOAST_ID)) return;

    toast({
      id: CHARACTERIZATION_TOAST_ID,
      title: 'Movimiento guardado',
      description: 'El ingreso se registró correctamente.',
      status: 'success',
      duration: null,
      isClosable: true,
      position: 'top-right',
    });
  };

  useEffect(() => {
    showToast();

    return () => toast.close(CHARACTERIZATION_TOAST_ID);
    // Esta historia abre una única notificación persistente al montarse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StoryFrame title="Toast v2">
      <Button alignSelf="flex-start" colorPalette="green" onClick={showToast}>
        Mostrar notificación
      </Button>
      <Text color="app.textMuted">La notificación permanece visible para comparación visual.</Text>
    </StoryFrame>
  );
};

export const TooltipV2 = () => (
  <StoryFrame title="Tooltip v2">
    <Box pt={12} alignSelf="flex-start">
      <Tooltip
        content="Consulta el detalle del movimiento"
        showArrow
        open
        positioning={{
          placement: "top"
        }}><span>
          <Button colorPalette="purple" variant="outline">
            Ver detalle
          </Button>
        </span></Tooltip>
    </Box>
  </StoryFrame>
);

const inventoryRows = [
  { code: 'MAT-001', description: 'Material de empaque', stock: '120', state: 'Disponible' },
  { code: 'MAT-002', description: 'Materia prima', stock: '48', state: 'Reservado' },
  { code: 'MAT-003', description: 'Insumo de proceso', stock: '7', state: 'Stock bajo' },
];

export const TableV2 = () => (
  <StoryFrame title="Table v2">
    <Table.ScrollArea bg="app.surface" borderWidth="1px" borderRadius="md">
      <Table.Root variant="simple" size="sm">
        <Table.Header bg="app.tableHeader">
          <Table.Row>
            <Table.ColumnHeader>Código</Table.ColumnHeader>
            <Table.ColumnHeader>Descripción</Table.ColumnHeader>
            <Table.ColumnHeader textAlign='end'>Existencias</Table.ColumnHeader>
            <Table.ColumnHeader>Estado</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {inventoryRows.map((row, index) => (
            <Table.Row key={row.code} bg={index === 1 ? 'app.rowSelectedBlue' : undefined}>
              <Table.Cell fontWeight="semibold">{row.code}</Table.Cell>
              <Table.Cell>{row.description}</Table.Cell>
              <Table.Cell textAlign='end'>{row.stock}</Table.Cell>
              <Table.Cell>{row.state}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Table.ScrollArea>
  </StoryFrame>
);

const processSteps = [
  { title: 'Origen', description: 'Orden y proveedor' },
  { title: 'Materiales', description: 'Cantidades y lotes' },
  { title: 'Confirmación', description: 'Revisión final' },
];

export const StepperAndProgressV2 = () => (
  <StoryFrame title="Stepper y Progress v2">
    <VStack align="stretch" gap={8} bg="app.surface" borderWidth="1px" borderRadius="md" p={6}>
      <Steps.Root step={1} colorPalette="teal" size="sm">
            <Steps.List>
          {processSteps.map((step) => (
            <Steps.Item key={step.title}>
              <Steps.Indicator>
                <Steps.Status complete={<LuCheck />} incomplete={<Steps.Number />} current={<Steps.Number />} />
              </Steps.Indicator>
              <Box flexShrink={0}>
                <Steps.Title>{step.title}</Steps.Title>
                <Steps.Description>{step.description}</Steps.Description>
              </Box>
              <Steps.Separator />
            </Steps.Item>
          ))}
        </Steps.List>
          </Steps.Root>
      <Box>
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="semibold">Progreso del asistente</Text>
          <Text color="app.textMuted">62 %</Text>
        </HStack>
        <Progress.Root value={62} colorPalette="teal" size="sm" borderRadius="full">
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      </Box>
    </VStack>
  </StoryFrame>
);
