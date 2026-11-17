// Exotic local-object boundary: geographic survey inputs are unsupported.
function unsupported(){throw new Error('Georeferencing is not enabled in the local product reconstruction engine');}
export const isGeographic=unsupported,localMetricFrame=unsupported,transform=unsupported,metresPerCrsUnit=unsupported;
