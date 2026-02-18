import FileChooserWithValidation from "../../../../components/FileChooserWithValidation/FileChooserWithValidation";
import { VerificarEstructuraInformeVentas } from "../PlaneacionProduccionService";

interface Step0CargarValidarExcelProps {
    setActiveStep: (step: number) => void;
    setExcelFile: (file: File) => void;
}

const EXCEL_EXTENSIONS = [".xlsx"];

export default function Step0CargarValidarExcel({ setActiveStep, setExcelFile }: Step0CargarValidarExcelProps) {
    return (
        <FileChooserWithValidation
            allowedExtensions={EXCEL_EXTENSIONS}
            rejectedExtensionMessage={{
                extensions: [".xls", ".xlsm", ".xlsb"],
                message: "El formato .xls no es compatible. Por favor, abra el archivo en Excel y guárdelo como .xlsx (Libro de Excel).",
            }}
            validateFile={(file) => VerificarEstructuraInformeVentas(file)}
            instructionText="En este paso debe cargar el informe de ventas detallado para proceder con la planeación de producción."
            onNext={(file) => { setExcelFile(file); setActiveStep(1); }}
        />
    );
}
