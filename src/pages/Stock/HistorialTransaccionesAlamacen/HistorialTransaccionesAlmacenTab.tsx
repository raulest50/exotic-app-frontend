
import { VStack} from "@chakra-ui/react";
import FiltroTranAlmacenSearch from "./FiltroTranAlmacenSearch.tsx";


function HistorialTransaccionesAlmacenTab(props) {

    return (
        <VStack w="full" spacing={4} align="stretch">
            <FiltroTranAlmacenSearch />
        </VStack>
    );

}
export default HistorialTransaccionesAlmacenTab;

