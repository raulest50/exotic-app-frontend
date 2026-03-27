// src/pages/Organigrama/OrganigramaPage.tsx
import { useState, useMemo } from "react";
import { 
  Container, 
  Box, 
  Spinner, 
  Center, 
  Text, 
  Flex, 
  IconButton, 
  Tabs, 
  TabList, 
  Tab, 
  TabPanels, 
  TabPanel,
  Collapse,
  useDisclosure
} from "@chakra-ui/react";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";
import MyHeader from "../../components/MyHeader.tsx";
import OrganizationChart from "./components/OrganizationChart";
import { MisionVision } from "./MisionVision";
import { AccessLevel } from "./types";
import { useAuth } from "../../context/AuthContext";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { useModuleAccessLevel } from "../../auth/usePermissions";

export default function OrganigramaPage() {
  const { accesosReady } = useAuth();
  const { nivel: organigramaNivel, isMaster } = useModuleAccessLevel(Modulo.ORGANIGRAMA);

  const accessLevel = useMemo((): AccessLevel => {
    if (isMaster || organigramaNivel >= AccessLevel.EDIT) return AccessLevel.EDIT;
    if (organigramaNivel >= AccessLevel.VIEW) return AccessLevel.VIEW;
    return AccessLevel.VIEW;
  }, [isMaster, organigramaNivel]);

  const isLoading = !accesosReady;
  const organizationChartId = "org-1"; // ID temporal hasta API real

  // Estado para el panel lateral
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });

  // Estado para las pestañas
  const [tabIndex, setTabIndex] = useState(0);


  return (
    <Container minW={['auto', 'container.lg', 'container.xl']} minH={"100vh"} w={"full"} h={'full'}>
      <MyHeader title={'Organigrama'} />

      {isLoading ? (
        <Center h="70vh">
          <Spinner size="xl" />
        </Center>
      ) : !organizationChartId ? (
        <Box p={8}>
          <Text>No se encontró ningún organigrama disponible.</Text>
        </Box>
      ) : (
        <Flex>
          {/* Panel lateral colapsable */}
          <Flex 
            direction="column" 
            bg="white" 
            borderRight="1px" 
            borderColor="gray.200"
            position="relative"
          >
            {/* Botón para colapsar/expandir el panel */}
            <IconButton
              aria-label={isOpen ? "Colapsar panel" : "Expandir panel"}
              icon={isOpen ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              position="absolute"
              right="-16px"
              top="50%"
              transform="translateY(-50%)"
              zIndex="1"
              size="sm"
              onClick={onToggle}
              borderRadius="full"
              boxShadow="md"
            />

            {/* Contenido del panel lateral */}
            <Collapse in={isOpen} animateOpacity>
              <Box w="250px" p={4}>
                <Tabs 
                  variant="unstyled" 
                  colorScheme="blue" 
                  orientation="vertical"
                  index={tabIndex} 
                  onChange={(index) => setTabIndex(index)}
                >
                  <TabList mb="1em" spacing={3}>
                    <Tab 
                      py={3}
                      px={4}
                      borderRadius="md"
                      fontWeight="medium"
                      _hover={{ bg: "blue.50", color: "blue.600" }}
                      _selected={{ bg: "blue.100", color: "blue.700", fontWeight: "bold" }}
                      transition="all 0.2s"
                    >
                      Organigrama
                    </Tab>
                    <Tab 
                      py={3}
                      px={4}
                      borderRadius="md"
                      fontWeight="medium"
                      _hover={{ bg: "blue.50", color: "blue.600" }}
                      _selected={{ bg: "blue.100", color: "blue.700", fontWeight: "bold" }}
                      transition="all 0.2s"
                    >
                      Misión y Visión
                    </Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel p={0}></TabPanel>
                    <TabPanel p={0}></TabPanel>
                  </TabPanels>
                </Tabs>
              </Box>
            </Collapse>
          </Flex>

          {/* Contenido principal */}
          <Box flex="1" ml={isOpen ? 4 : 0}>
            <Tabs 
              variant="enclosed" 
              colorScheme="blue" 
              isLazy 
              index={tabIndex} 
              onChange={(index) => setTabIndex(index)}
            >
              <TabList display="none">
                <Tab>Organigrama</Tab>
                <Tab>Misión y Visión</Tab>
              </TabList>
              <TabPanels>
                <TabPanel p={0}>
                  <OrganizationChart
                    accessLevel={accessLevel}
                    isMaster={isMaster}
                    organizationChartId={organizationChartId}
                  />
                </TabPanel>
                <TabPanel p={0}>
                  <MisionVision />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </Box>
        </Flex>
      )}
    </Container>
  );
}
