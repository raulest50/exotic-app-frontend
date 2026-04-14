import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertIcon,
  Box,
  Code,
  Divider,
  Flex,
  Heading,
  Input,
  InputGroup,
  InputLeftElement,
  Tag,
  TagLabel,
  Text,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { Modulo } from "./GestionUsuarios/types";

interface ModuleLevel {
  level: number;
  description: string;
}

interface ModuleDoc {
  title: string;
  description: string;
  implementationDetails: boolean;
  implementationCode?: string;
  levels: ModuleLevel[];
}

type ModuleDocsType = {
  [key in Modulo]: ModuleDoc;
};

const moduleDocs: ModuleDocsType = {
  [Modulo.USUARIOS]: {
    title: "Modulo de Usuarios",
    description: "Gestion de usuarios y asignacion de accesos",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Visualizacion de usuarios existentes." },
      { level: 2, description: "Creacion y modificacion de usuarios." },
      { level: 3, description: "Gestion completa de usuarios y sus accesos." },
    ],
  },
  [Modulo.PRODUCTOS]: {
    title: "Modulo de Productos",
    description: "Gestion del catalogo de productos",
    implementationDetails: true,
    implementationCode: `
import { useAccessSnapshot } from "../../../auth/usePermissions";
import { moduleAccessRule } from "../../../auth/accessHelpers";
import { Modulo } from "../../Usuarios/GestionUsuarios/types";

const access = useAccessSnapshot();

const tabs = [
  {
    label: "Codificar Material",
    accesoValido: moduleAccessRule(Modulo.PRODUCTOS, 2),
  },
  {
    label: "Consulta",
    accesoValido: moduleAccessRule(Modulo.PRODUCTOS, 1),
  },
];

const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));`,
    levels: [
      { level: 1, description: 'Solo permite acceder a "Consulta" para visualizar productos existentes.' },
      { level: 2, description: "Permite acceder a tabs de creacion y mantenimiento del modulo." },
      { level: 3, description: "Acceso completo a todas las funcionalidades del modulo." },
    ],
  },
  [Modulo.PRODUCCION]: {
    title: "Modulo de Produccion",
    description: "Gestion de ordenes de produccion, procesos productivos, monitoreo de areas operativas y aprobacion semanal MPS",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Visualizacion de informacion de produccion." },
      { level: 2, description: "Creacion y modificacion de ordenes de produccion." },
      { level: 3, description: "Gestion completa del proceso productivo." },
    ],
  },
  [Modulo.STOCK]: {
    title: "Modulo de Stock",
    description: "Gestion de inventario y existencias",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Visualizacion de niveles de stock." },
      { level: 2, description: "Registro de movimientos de inventario." },
      { level: 3, description: "Control total del inventario." },
    ],
  },
  [Modulo.PROVEEDORES]: {
    title: "Modulo de Proveedores",
    description: "Gestion de proveedores y sus catalogos",
    implementationDetails: true,
    implementationCode: `
import { useAccessSnapshot } from "../../auth/usePermissions";
import { moduleAccessRule } from "../../auth/accessHelpers";
import { Modulo } from "../Usuarios/GestionUsuarios/types";

const access = useAccessSnapshot();

const tabs = [
  {
    label: "Codificar Proveedor",
    accesoValido: moduleAccessRule(Modulo.PROVEEDORES, 2),
  },
  {
    label: "Consultar Proveedores",
    accesoValido: moduleAccessRule(Modulo.PROVEEDORES, 1),
  },
];

const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));`,
    levels: [
      { level: 1, description: 'Solo permite acceder a "Consultar Proveedores".' },
      { level: 2, description: 'Permite acceder tambien a "Codificar Proveedor".' },
      { level: 3, description: "Acceso completo a todas las funcionalidades del modulo." },
    ],
  },
  [Modulo.COMPRAS]: {
    title: "Modulo de Compras",
    description: "Gestion de ordenes de compra y adquisiciones",
    implementationDetails: true,
    implementationCode: `
import { effectiveMaxNivelForModule } from "../../auth/accessHelpers";
import { useAuth } from "../../context/AuthContext";
import { Modulo } from "../Usuarios/GestionUsuarios/types";

const { moduloAccesos, isMasterLike } = useAuth();
const comprasAccessLevel = effectiveMaxNivelForModule(
  isMasterLike,
  moduloAccesos,
  Modulo.COMPRAS
);

{comprasAccessLevel >= 2 && (
  <Box onClick={handleActualizarOrden}>
    Actualizar Estado de la Orden
  </Box>
)}`,
    levels: [
      { level: 1, description: "Permite crear y visualizar ordenes de compra." },
      { level: 2, description: "Incluye nivel 1 y permite cancelar, liberar y enviar ordenes." },
    ],
  },
  [Modulo.SEGUIMIENTO_PRODUCCION]: {
    title: "Modulo de Gestion de Areas Operativas",
    description: "Gestion y configuracion de areas operativas de produccion",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Visualizacion de areas operativas." },
      { level: 2, description: "Creacion y edicion de areas operativas." },
      { level: 3, description: "Control total de areas operativas." },
    ],
  },
  [Modulo.CLIENTES]: {
    title: "Modulo de Clientes",
    description: "Gestion de clientes y relaciones comerciales",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Consulta de clientes existentes." },
      { level: 2, description: "Creacion y actualizacion de clientes." },
      { level: 3, description: "Acceso completo al modulo." },
    ],
  },
  [Modulo.VENTAS]: {
    title: "Modulo de Ventas",
    description: "Gestion integral de operaciones y reportes de ventas",
    implementationDetails: true,
    implementationCode: `
import { useAccessSnapshot } from "../../auth/usePermissions";
import { moduleAccessRule } from "../../auth/accessHelpers";
import { Modulo } from "../Usuarios/GestionUsuarios/types";

const access = useAccessSnapshot();

const tabs = [
  { label: "Crear Venta", accesoValido: moduleAccessRule(Modulo.VENTAS, 1) },
  { label: "Historial de Ventas", accesoValido: moduleAccessRule(Modulo.VENTAS, 1) },
  { label: "Reportes", accesoValido: moduleAccessRule(Modulo.VENTAS, 1) },
  { label: "Crear vendedor nuevo", accesoValido: moduleAccessRule(Modulo.VENTAS, 3) },
];

const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));`,
    levels: [
      { level: 1, description: "Permite consultar la informacion de ventas existentes." },
      { level: 2, description: "Permite gestionar ventas estandar y revisar reportes." },
      { level: 3, description: "Incluye niveles 1 y 2 y puede crear un nuevo vendedor." },
    ],
  },
  [Modulo.TRANSACCIONES_ALMACEN]: {
    title: "Modulo de Transacciones de Almacen",
    description: "Gestion de movimientos y transacciones en almacen",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Visualizacion de transacciones." },
      { level: 2, description: "Registro de entradas y salidas." },
      { level: 3, description: "Control total de operaciones de almacen." },
    ],
  },
  [Modulo.ACTIVOS]: {
    title: "Modulo de Activos Fijos",
    description: "Gestion de activos fijos y equipamiento",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Visualizacion de activos." },
      { level: 2, description: "Nivel 1 + crear ordenes de compra para activos fijos." },
      { level: 3, description: "Nivel 1 + 2 + dar ingreso a activos fijos." },
      { level: 4, description: "Control total de activos fijos y equipamiento." },
    ],
  },
  [Modulo.CONTABILIDAD]: {
    title: "Modulo de Contabilidad",
    description: "Gestion contable y financiera",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Visualizacion de informacion contable." },
      { level: 2, description: "Registro de asientos contables." },
      { level: 3, description: "Control total de la gestion contable." },
    ],
  },
  [Modulo.PERSONAL_PLANTA]: {
    title: "Modulo de Personal de Planta",
    description: "Gestion del personal operativo",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Visualizacion de informacion del personal." },
      { level: 2, description: "Registro y modificacion de informacion del personal." },
      { level: 3, description: "Control total de la gestion de personal." },
    ],
  },
  [Modulo.BINTELLIGENCE]: {
    title: "Modulo de Business Intelligence",
    description: "Analisis de datos y reportes avanzados",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Visualizacion de reportes predefinidos." },
      { level: 2, description: "Creacion de reportes personalizados." },
      { level: 3, description: "Acceso total a herramientas de analisis." },
    ],
  },
  [Modulo.OPERACIONES_CRITICAS_BD]: {
    title: "Modulo de Operaciones Criticas en BD",
    description: "Herramientas operativas sensibles protegidas por reglas especiales y flags adicionales",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Acceso a las tabs habilitadas del modulo, sujeto a flags de super master." },
      { level: 2, description: "Reservado para futuras distinciones finas dentro del modulo." },
      { level: 3, description: "Acceso total del modulo, manteniendo el requisito extra de usuario master-like." },
    ],
  },
  [Modulo.ADMINISTRACION_ALERTAS]: {
    title: "Modulo de Administracion de Alertas",
    description: "Gestion de notificaciones y alertas del sistema",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Visualizacion de alertas." },
      { level: 2, description: "Configuracion de alertas." },
      { level: 3, description: "Administracion completa del sistema de alertas." },
    ],
  },
  [Modulo.CRONOGRAMA]: {
    title: "Modulo de Cronograma",
    description: "Gestion de planificacion y cronogramas",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Visualizacion de cronogramas." },
      { level: 2, description: "Creacion y modificacion de eventos en cronogramas." },
      { level: 3, description: "Control total de la planificacion." },
    ],
  },
  [Modulo.ORGANIGRAMA]: {
    title: "Modulo de Organigrama",
    description: "Gestion de estructura organizacional y cargos",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Consulta de la estructura organizacional." },
      { level: 2, description: "Edicion de cargos y relaciones." },
      { level: 3, description: "Control total del modulo." },
    ],
  },
  [Modulo.PAGOS_PROVEEDORES]: {
    title: "Modulo de Pagos a Proveedores",
    description: "Gestion de pagos y conciliaciones con proveedores",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Consulta de pagos existentes." },
      { level: 2, description: "Registro y actualizacion de pagos." },
      { level: 3, description: "Control total del modulo." },
    ],
  },
  [Modulo.MASTER_DIRECTIVES]: {
    title: "Modulo de Master Directives",
    description: "Configuracion avanzada reservada para super_master",
    implementationDetails: false,
    levels: [
      { level: 1, description: "Acceso base al modulo, ademas restringido por la regla especial de super_master." },
      { level: 2, description: "Reservado para futuras capacidades adicionales." },
      { level: 3, description: "Control total del modulo, manteniendo la restriccion especial." },
    ],
  },
};

export default function InfoNiveles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredModules, setFilteredModules] = useState<Modulo[]>(Object.keys(moduleDocs) as Modulo[]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = (Object.keys(moduleDocs) as Modulo[]).filter(
        (key) =>
          key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          moduleDocs[key].title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          moduleDocs[key].description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredModules(filtered);
      return;
    }

    setFilteredModules(Object.keys(moduleDocs) as Modulo[]);
  }, [searchTerm]);

  return (
    <Box p={4}>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="md">Documentacion de Niveles de Acceso</Heading>
        <Tag size="md" colorScheme="blue" borderRadius="full" px={3}>
          <TagLabel>{Object.keys(moduleDocs).length} modulos</TagLabel>
        </Tag>
      </Flex>

      <Alert status="info" mb={4} variant="left-accent" borderRadius="md">
        <AlertIcon alignSelf="flex-start" mt={1} />
        <Box width="100%">
          <Heading size="sm" mb={2} textAlign="left">
            Informacion General
          </Heading>
          <Text mb={3} textAlign="left">
            El sistema usa niveles de acceso por modulo y la UI toma como fuente de verdad el snapshot de
            <Code mx={1}>GET /api/auth/me</Code>.
          </Text>
          <Flex direction="column" gap={2} ml={2} mb={3}>
            <Flex align="center">
              <Tag size="sm" colorScheme="green" mr={2} minW="60px" justifyContent="center">
                Nivel 1
              </Tag>
              <Text>Acceso basico</Text>
            </Flex>
            <Flex align="center">
              <Tag size="sm" colorScheme="blue" mr={2} minW="60px" justifyContent="center">
                Nivel 2
              </Tag>
              <Text>Consulta y creacion o modificacion</Text>
            </Flex>
            <Flex align="center">
              <Tag size="sm" colorScheme="purple" mr={2} minW="60px" justifyContent="center">
                Nivel 3
              </Tag>
              <Text>Acceso completo del modulo</Text>
            </Flex>
          </Flex>
          <Text textAlign="left">
            Los usuarios master-like tienen bypass completo sobre las reglas declarativas de acceso.
          </Text>
        </Box>
      </Alert>

      <InputGroup mb={6}>
        <InputLeftElement pointerEvents="none">
          <SearchIcon color="gray.300" />
        </InputLeftElement>
        <Input
          placeholder="Buscar modulo por nombre o descripcion..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="md"
          variant="filled"
          _hover={{ bg: "gray.100" }}
          _focus={{ bg: "white", borderColor: "blue.500" }}
        />
      </InputGroup>

      {filteredModules.length === 0 && (
        <Alert status="info" mb={4}>
          <AlertIcon />
          No se encontraron modulos que coincidan con la busqueda.
        </Alert>
      )}

      <Accordion allowMultiple>
        {filteredModules.map((moduleKey) => (
          <AccordionItem key={moduleKey} mb={2} borderWidth="1px" borderRadius="md">
            <h2>
              <AccordionButton _expanded={{ bg: "blue.50", color: "blue.700" }}>
                <Box flex="1" textAlign="left">
                  <Flex alignItems="center">
                    <Text fontWeight="bold" mr={2}>
                      {moduleDocs[moduleKey].title}
                    </Text>
                    <Tag size="sm" colorScheme="gray" borderRadius="full">
                      <TagLabel>{moduleDocs[moduleKey].levels.length} niveles</TagLabel>
                    </Tag>
                  </Flex>
                </Box>
                <AccordionIcon />
              </AccordionButton>
            </h2>
            <AccordionPanel pb={4}>
              <Text mb={4}>{moduleDocs[moduleKey].description}</Text>

              <Heading size="sm" mb={3}>
                Niveles de Acceso:
              </Heading>
              <Box borderLeft="2px solid" borderColor="gray.200" pl={4} mb={4}>
                {moduleDocs[moduleKey].levels.map((level) => (
                  <Box
                    key={level.level}
                    mb={3}
                    p={3}
                    bg="gray.50"
                    borderRadius="md"
                    borderLeft="4px solid"
                    borderLeftColor={getLevelColor(level.level)}
                    boxShadow="sm"
                    transition="all 0.2s"
                    _hover={{ boxShadow: "md" }}
                  >
                    <Flex align="center">
                      <Tag size="md" colorScheme={getColorSchemeForLevel(level.level)} mr={3}>
                        <TagLabel>Nivel {level.level}</TagLabel>
                      </Tag>
                      <Text>{level.description}</Text>
                    </Flex>
                  </Box>
                ))}
              </Box>

              {moduleDocs[moduleKey].implementationDetails && (
                <>
                  <Divider my={4} />
                  <Heading size="sm" mb={2}>
                    Implementacion:
                  </Heading>
                  <Box bg="gray.50" p={3} borderRadius="md" overflowX="auto">
                    <Code display="block" whiteSpace="pre" p={2}>
                      {moduleDocs[moduleKey].implementationCode}
                    </Code>
                  </Box>
                </>
              )}

              <Divider my={4} />

              <Box mt={2}>
                <Text fontSize="sm" color="gray.600">
                  Nota: los niveles son acumulativos. Un usuario con nivel superior conserva los permisos de
                  los niveles anteriores.
                </Text>
              </Box>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Box>
  );
}

function getColorSchemeForLevel(level: number): string {
  switch (level) {
    case 1:
      return "green";
    case 2:
      return "blue";
    case 3:
      return "purple";
    case 4:
      return "orange";
    default:
      return "gray";
  }
}

function getLevelColor(level: number): string {
  switch (level) {
    case 1:
      return "green.500";
    case 2:
      return "blue.500";
    case 3:
      return "purple.500";
    case 4:
      return "orange.500";
    default:
      return "gray.500";
  }
}
