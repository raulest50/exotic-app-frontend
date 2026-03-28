import { useMemo, useState } from "react";
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
  useDisclosure,
} from "@chakra-ui/react";
import { ChevronRightIcon, ChevronLeftIcon } from "@chakra-ui/icons";
import MyHeader from "../../components/MyHeader.tsx";
import OrganizationChart from "./components/OrganizationChart";
import { MisionVision } from "./MisionVision";
import { AccessLevel } from "./types";
import { useAuth } from "../../context/AuthContext";
import { Modulo } from "../Usuarios/GestionUsuarios/types.tsx";
import { tabAccessRule } from "../../auth/accessHelpers";
import { useAccessSnapshot, useModuleAccessLevel } from "../../auth/usePermissions";
import type { AccessRule } from "../../auth/accessModel.ts";

export default function OrganigramaPage() {
  const { accesosReady } = useAuth();
  const access = useAccessSnapshot();
  const { nivel: organigramaNivel, isMaster } = useModuleAccessLevel(Modulo.ORGANIGRAMA);

  const accessLevel = useMemo((): AccessLevel => {
    if (isMaster || organigramaNivel >= AccessLevel.EDIT) return AccessLevel.EDIT;
    if (organigramaNivel >= AccessLevel.VIEW) return AccessLevel.VIEW;
    return AccessLevel.VIEW;
  }, [isMaster, organigramaNivel]);

  const isLoading = !accesosReady;
  const organizationChartId = "org-1";
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });
  const [tabIndex, setTabIndex] = useState(0);

  const tabs: Array<{ key: string; label: string; render: () => JSX.Element; accesoValido: AccessRule }> = [
    {
      key: "organigrama",
      label: "Organigrama",
      render: () => (
        <OrganizationChart
          accessLevel={accessLevel}
          isMaster={isMaster}
          organizationChartId={organizationChartId}
        />
      ),
      accesoValido: tabAccessRule(Modulo.ORGANIGRAMA, "ORGANIGRAMA", 1),
    },
    {
      key: "mision-vision",
      label: "Mision y Vision",
      render: () => <MisionVision />,
      accesoValido: tabAccessRule(Modulo.ORGANIGRAMA, "MISION_VISION", 1),
    },
  ];

  const visibleTabs = tabs.filter((tab) => tab.accesoValido(access));
  const safeTabIndex = Math.min(tabIndex, Math.max(visibleTabs.length - 1, 0));

  return (
    <Container minW={["auto", "container.lg", "container.xl"]} minH={"100vh"} w={"full"} h={"full"}>
      <MyHeader title={"Organigrama"} />

      {isLoading ? (
        <Center h="70vh">
          <Spinner size="xl" />
        </Center>
      ) : !organizationChartId ? (
        <Box p={8}>
          <Text>No se encontro ningun organigrama disponible.</Text>
        </Box>
      ) : visibleTabs.length === 0 ? (
        <Box p={8}>
          <Text>No tienes acceso a ninguna tab de este modulo.</Text>
        </Box>
      ) : (
        <Flex>
          <Flex direction="column" bg="white" borderRight="1px" borderColor="gray.200" position="relative">
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

            <Collapse in={isOpen} animateOpacity>
              <Box w="250px" p={4}>
                <Tabs variant="unstyled" colorScheme="blue" orientation="vertical" index={safeTabIndex} onChange={(index) => setTabIndex(index)}>
                  <TabList mb="1em" spacing={3}>
                    {visibleTabs.map((tab) => (
                      <Tab
                        key={tab.key}
                        py={3}
                        px={4}
                        borderRadius="md"
                        fontWeight="medium"
                        _hover={{ bg: "blue.50", color: "blue.600" }}
                        _selected={{ bg: "blue.100", color: "blue.700", fontWeight: "bold" }}
                        transition="all 0.2s"
                      >
                        {tab.label}
                      </Tab>
                    ))}
                  </TabList>
                  <TabPanels>
                    {visibleTabs.map((tab) => (
                      <TabPanel key={tab.key} p={0}></TabPanel>
                    ))}
                  </TabPanels>
                </Tabs>
              </Box>
            </Collapse>
          </Flex>

          <Box flex="1" ml={isOpen ? 4 : 0}>
            <Tabs variant="enclosed" colorScheme="blue" isLazy index={safeTabIndex} onChange={(index) => setTabIndex(index)}>
              <TabList display="none">
                {visibleTabs.map((tab) => (
                  <Tab key={tab.key}>{tab.label}</Tab>
                ))}
              </TabList>
              <TabPanels>
                {visibleTabs.map((tab) => (
                  <TabPanel key={tab.key} p={0}>
                    {tab.render()}
                  </TabPanel>
                ))}
              </TabPanels>
            </Tabs>
          </Box>
        </Flex>
      )}
    </Container>
  );
}
