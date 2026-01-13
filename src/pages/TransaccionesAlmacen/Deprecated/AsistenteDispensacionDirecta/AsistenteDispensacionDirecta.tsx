import StepOneComponent from './StepOneComponent.tsx';
import StepTwoComponent from './StepTwoComponent.tsx';
import {useState} from 'react';
import {DispensacionDirectaDetalleItem} from '../../types.tsx';

export function AsistenteDispensacionDirecta(){
    const [viewMode, setViewMode] = useState(0);
    const [dispensacion, setDispensacion] = useState<DispensacionDirectaDetalleItem[]>([]);

    return viewMode === 0 ? (
        <StepOneComponent setViewMode={setViewMode} setDispensacion={setDispensacion} />
    ) : (
        <StepTwoComponent setViewMode={setViewMode} items={dispensacion} setItems={setDispensacion} />
    );
}

