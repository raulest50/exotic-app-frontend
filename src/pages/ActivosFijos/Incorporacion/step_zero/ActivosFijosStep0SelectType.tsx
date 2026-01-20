import { useState } from 'react';
import { Flex, useToast } from '@chakra-ui/react';
import axios from 'axios';
import EndPointsURL from '../../../../api/EndPointsURL';
import { IncorporacionActivoDto, OrdenCompraActivo } from "../../types.tsx";
import { TipoIngresoSelection } from "./TipoIngresoSelection.tsx";
import { TIPO_INCORPORACION } from "../../types.tsx";
import { PanelBusquedaOCFA } from "./PanelBusquedaOCFA.tsx";

type Props = {
    setActiveStep: (step: number) => void;
    setOrdenCompraActivo: (ordenCompraActivo: OrdenCompraActivo) => void;
    setIncorporacionActivoHeader: (incorporacionActivoHeader: IncorporacionActivoDto) => void;
};

/**
 *
 * se debe seleccionar el tipo de incorporacion, si es con OC o sin OC,
 * o si se trata de un activo fijo existente.
 * en caso de seringreso por OC se debe digitar el id de la OC-AF.
 *
 * @param setStep
 * @constructor
 */
export function ActivosFijosStep0SelectType({
                                        setActiveStep,
                                        setOrdenCompraActivo,
                                        setIncorporacionActivoHeader }: Props) {

  const VIEW_MODES = {SEL_TFI:0, IDENT_OC:1};
  const [viewMode, setViewMode] = useState<number>(VIEW_MODES.SEL_TFI);
  const [ocNumber, setOcNumber] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const toast = useToast();


    /**
     * responsable de usar el tipo de incorporacion seleccionado
     * en el componente TipoIngresoSelection y actualizar los
     * valores correspondientes para pasar al siguiente step.
     * @param tipo_incorporacion
     */
  const setTipoIncorporacion =
      (tipo_incorporacion: string):void => {
    if(tipo_incorporacion === TIPO_INCORPORACION.CON_OC){
        setViewMode(VIEW_MODES.IDENT_OC);
    }

    if(tipo_incorporacion === TIPO_INCORPORACION.SIN_OC){
        const incorporacionData: IncorporacionActivoDto = {
            tipoIncorporacion: TIPO_INCORPORACION.SIN_OC
        };
        setIncorporacionActivoHeader(incorporacionData);
        setActiveStep(1);
    }

    if(tipo_incorporacion === TIPO_INCORPORACION.AF_EXISTENTE){
        const incorporacionData: IncorporacionActivoDto = {
            tipoIncorporacion: TIPO_INCORPORACION.AF_EXISTENTE
        };
        setIncorporacionActivoHeader(incorporacionData);
        setActiveStep(1);
    }
  }

  const handleSearchOC = async () => {
    if (!ocNumber.trim()) {

      toast({
        title: "Campo requerido",
        description: "Por favor ingrese un número de OC-AF",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSearching(true);
    const endpoints = new EndPointsURL();

    try {
      // Obtener los datos de la orden desde la API
      const url = endpoints.get_orden_compra_activo_by_id.replace('{ordenCompraActivoId}', ocNumber);
      const response = await axios.get(url);
      const ordenCompra = response.data;

      setOrdenCompraActivo(ordenCompra);

      const incorporacionData: IncorporacionActivoDto = {
        tipoIncorporacion: TIPO_INCORPORACION.CON_OC,
        id_OC_AF: parseInt(ocNumber)
      };
      setIncorporacionActivoHeader(incorporacionData);

      setActiveStep(1);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo encontrar la orden de compra. Verifique el número e intente nuevamente.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSearching(false);
    }
  }

  const ConditionalRender = () => {
    if(viewMode === VIEW_MODES.SEL_TFI){
      return(
          <TipoIngresoSelection setTipoIncorporacion={setTipoIncorporacion}/>
      );
    }
    if(viewMode === VIEW_MODES.IDENT_OC){
      return(
          <PanelBusquedaOCFA 
              ocNumber={ocNumber}
              setOcNumber={setOcNumber}
              isSearching={isSearching}
              onBack={() => setViewMode(VIEW_MODES.SEL_TFI)}
              onSearch={handleSearchOC}
          />
      )
    }
  }

  return (
    <Flex direction="column" gap={10} w="full">
      <ConditionalRender />
    </Flex>
  );
}
