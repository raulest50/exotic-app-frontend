import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Progress,
  Select,
  SimpleGrid,
  Step,
  StepDescription,
  StepIcon,
  StepIndicator,
  StepNumber,
  StepSeparator,
  StepStatus,
  StepTitle,
  Stepper,
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
  Tooltip,
  Tr,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';

const StoryFrame = ({ children, title }: { children: ReactNode; title: string }) => (
  <Box minH="100vh" bg="app.surfaceSubtle" color="chakra-body-text" p={{ base: 4, md: 8 }}>
    <VStack align="stretch" spacing={6} maxW="960px" mx="auto">
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
  const { isOpen, onClose, onOpen } = useDisclosure({ defaultIsOpen: true });
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <StoryFrame title="Modal v2">
      <Button ref={triggerRef} alignSelf="flex-start" colorScheme="blue" onClick={onOpen}>
        Abrir modal
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} finalFocusRef={triggerRef} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Confirmar operación</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>La información permanecerá sin cambios hasta confirmar.</Text>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button colorScheme="blue" onClick={onClose}>
              Confirmar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </StoryFrame>
  );
};

export const DrawerV2 = () => {
  const { isOpen, onClose, onOpen } = useDisclosure({ defaultIsOpen: true });
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <StoryFrame title="Drawer v2">
      <Button ref={triggerRef} alignSelf="flex-start" colorScheme="teal" onClick={onOpen}>
        Abrir panel
      </Button>
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} finalFocusRef={triggerRef} size="sm">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">Filtros del inventario</DrawerHeader>
          <DrawerBody>
            <VStack align="stretch" spacing={4} pt={2}>
              <FormControl>
                <FormLabel>Estado</FormLabel>
                <Select defaultValue="available">
                  <option value="all">Todos</option>
                  <option value="available">Disponible</option>
                  <option value="reserved">Reservado</option>
                </Select>
              </FormControl>
              <Checkbox defaultChecked colorScheme="teal">
                Incluir existencias bajas
              </Checkbox>
            </VStack>
          </DrawerBody>
          <DrawerFooter borderTopWidth="1px" gap={3}>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button colorScheme="teal" onClick={onClose}>
              Aplicar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </StoryFrame>
  );
};

export const TabsV2 = () => {
  const [tabIndex, setTabIndex] = useState(1);

  return (
    <StoryFrame title="Tabs v2">
      <Tabs
        index={tabIndex}
        onChange={setTabIndex}
        colorScheme="blue"
        variant="enclosed"
        isLazy
        lazyBehavior="keepMounted"
      >
        <TabList overflowX="auto">
          <Tab>Resumen</Tab>
          <Tab>Movimientos</Tab>
          <Tab isDisabled>Auditoría</Tab>
        </TabList>
        <TabPanels bg="app.surface" borderWidth="1px" borderTopWidth="0">
          <TabPanel>
            <Text>Resumen general del inventario.</Text>
          </TabPanel>
          <TabPanel>
            <VStack align="stretch" spacing={2}>
              <Text fontWeight="semibold">Último movimiento</Text>
              <Text color="app.textMuted">Ingreso OCM · 24 unidades · Lote L-001</Text>
            </VStack>
          </TabPanel>
          <TabPanel>
            <Text>Contenido restringido.</Text>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </StoryFrame>
  );
};

export const FormsV2 = () => {
  const [quantity, setQuantity] = useState('12.50');
  const [requiresInspection, setRequiresInspection] = useState(true);

  return (
    <StoryFrame title="Formularios v2">
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5} bg="app.surface" borderWidth="1px" borderRadius="md" p={6}>
        <FormControl isRequired>
          <FormLabel>Código de material</FormLabel>
          <Input defaultValue="MAT-001" />
          <FormHelperText>Identificador interno obligatorio.</FormHelperText>
        </FormControl>
        <FormControl>
          <FormLabel>Tipo de movimiento</FormLabel>
          <Select defaultValue="entry">
            <option value="entry">Ingreso</option>
            <option value="dispatch">Dispensación</option>
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel>Cantidad</FormLabel>
          <NumberInput value={quantity} min={0} precision={2} step={0.25} onChange={setQuantity}>
            <NumberInputField />
            <NumberInputStepper>
              <NumberIncrementStepper />
              <NumberDecrementStepper />
            </NumberInputStepper>
          </NumberInput>
        </FormControl>
        <FormControl isInvalid>
          <FormLabel>Lote</FormLabel>
          <Input value="" onChange={() => undefined} placeholder="Ej. L-001" />
          <FormErrorMessage>El lote es obligatorio.</FormErrorMessage>
        </FormControl>
        <FormControl isReadOnly>
          <FormLabel>Responsable</FormLabel>
          <Input value="Usuario de prueba" readOnly bg="app.inputReadonly" />
        </FormControl>
        <FormControl isDisabled>
          <FormLabel>Ubicación automática</FormLabel>
          <Input value="Bodega principal" readOnly />
        </FormControl>
        <Checkbox
          isChecked={requiresInspection}
          colorScheme="teal"
          onChange={(event) => setRequiresInspection(event.target.checked)}
        >
          Requiere inspección de calidad
        </Checkbox>
      </SimpleGrid>
    </StoryFrame>
  );
};

const CHARACTERIZATION_TOAST_ID = 'chakra-v2-characterization-toast';

export const ToastV2 = () => {
  const toast = useToast();

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
      <Button alignSelf="flex-start" colorScheme="green" onClick={showToast}>
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
        label="Consulta el detalle del movimiento"
        placement="top"
        hasArrow
        isOpen
        shouldWrapChildren
      >
        <Button colorScheme="purple" variant="outline">
          Ver detalle
        </Button>
      </Tooltip>
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
    <TableContainer bg="app.surface" borderWidth="1px" borderRadius="md">
      <Table variant="simple" size="sm">
        <Thead bg="app.tableHeader">
          <Tr>
            <Th>Código</Th>
            <Th>Descripción</Th>
            <Th isNumeric>Existencias</Th>
            <Th>Estado</Th>
          </Tr>
        </Thead>
        <Tbody>
          {inventoryRows.map((row, index) => (
            <Tr key={row.code} bg={index === 1 ? 'app.rowSelectedBlue' : undefined}>
              <Td fontWeight="semibold">{row.code}</Td>
              <Td>{row.description}</Td>
              <Td isNumeric>{row.stock}</Td>
              <Td>{row.state}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  </StoryFrame>
);

const processSteps = [
  { title: 'Origen', description: 'Orden y proveedor' },
  { title: 'Materiales', description: 'Cantidades y lotes' },
  { title: 'Confirmación', description: 'Revisión final' },
];

export const StepperAndProgressV2 = () => (
  <StoryFrame title="Stepper y Progress v2">
    <VStack align="stretch" spacing={8} bg="app.surface" borderWidth="1px" borderRadius="md" p={6}>
      <Stepper index={1} colorScheme="teal" size="sm">
        {processSteps.map((step) => (
          <Step key={step.title}>
            <StepIndicator>
              <StepStatus complete={<StepIcon />} incomplete={<StepNumber />} active={<StepNumber />} />
            </StepIndicator>
            <Box flexShrink={0}>
              <StepTitle>{step.title}</StepTitle>
              <StepDescription>{step.description}</StepDescription>
            </Box>
            <StepSeparator />
          </Step>
        ))}
      </Stepper>
      <Box>
        <HStack justify="space-between" mb={2}>
          <Text fontWeight="semibold">Progreso del asistente</Text>
          <Text color="app.textMuted">62 %</Text>
        </HStack>
        <Progress value={62} colorScheme="teal" size="sm" borderRadius="full" />
      </Box>
    </VStack>
  </StoryFrame>
);
