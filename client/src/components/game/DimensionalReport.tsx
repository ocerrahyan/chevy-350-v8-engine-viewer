import { Html } from "@react-three/drei";
import {
  BLOCK,
  CRANKSHAFT,
  CAMSHAFT,
  CONNECTING_ROD,
  PISTON,
  LIFTERS,
  VALVES,
} from "@/lib/specs/SBC350Specifications";

interface DimensionRow {
  part: string;
  realValue: number;
  modelValue: number;
  unit: string;
  decimals: number;
}

function checkTolerance(real: number, model: number, tolerancePercent: number = 0.1): boolean {
  if (real === 0) return model === 0;
  const percentDiff = Math.abs((model - real) / real) * 100;
  return percentDiff <= tolerancePercent;
}

export function DimensionalReport() {
  const dimensions: DimensionRow[] = [
    { part: "Bore diameter", realValue: 4.000, modelValue: BLOCK.BORE_DIAMETER, unit: '"', decimals: 3 },
    { part: "Stroke", realValue: 3.480, modelValue: CRANKSHAFT.STROKE, unit: '"', decimals: 3 },
    { part: "Bore spacing", realValue: 4.400, modelValue: BLOCK.BORE_SPACING, unit: '"', decimals: 3 },
    { part: "Deck height", realValue: 9.025, modelValue: BLOCK.DECK_HEIGHT, unit: '"', decimals: 3 },
    { part: "Cam-to-crank distance", realValue: 4.521, modelValue: CAMSHAFT.HEIGHT_FROM_CRANK, unit: '"', decimals: 3 },
    { part: "Rod length", realValue: 5.700, modelValue: CONNECTING_ROD.LENGTH, unit: '"', decimals: 3 },
    { part: "Main journal diameter", realValue: 2.4488, modelValue: CRANKSHAFT.MAIN_JOURNAL_DIAMETER, unit: '"', decimals: 4 },
    { part: "Rod journal diameter", realValue: 2.100, modelValue: CRANKSHAFT.ROD_JOURNAL_DIAMETER, unit: '"', decimals: 3 },
    { part: "Lifter diameter", realValue: 0.842, modelValue: LIFTERS.BODY_DIAMETER, unit: '"', decimals: 3 },
    { part: "Intake valve dia", realValue: 1.940, modelValue: VALVES.INTAKE_HEAD_DIAMETER, unit: '"', decimals: 3 },
    { part: "Exhaust valve dia", realValue: 1.500, modelValue: VALVES.EXHAUST_HEAD_DIAMETER, unit: '"', decimals: 3 },
    { part: "Compression height", realValue: 1.550, modelValue: PISTON.COMPRESSION_HEIGHT, unit: '"', decimals: 3 },
    { part: "V-angle", realValue: 90, modelValue: BLOCK.V_ANGLE, unit: "°", decimals: 0 },
  ];

  const passCount = dimensions.filter(d => checkTolerance(d.realValue, d.modelValue)).length;
  const allPass = passCount === dimensions.length;

  return (
    <Html
      position={[0.8, 0.4, 0]}
      center={false}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div className="bg-black/90 backdrop-blur-sm rounded-lg p-3 text-[10px] font-mono text-white border border-cyan-500/60 min-w-[340px]">
        <div className="font-bold mb-2 text-cyan-400 border-b border-cyan-500/30 pb-1 flex justify-between items-center">
          <span>SBC 350 Dimensional Validation</span>
          <span className={`text-xs px-2 py-0.5 rounded ${allPass ? 'bg-green-600' : 'bg-red-600'}`}>
            {passCount}/{dimensions.length} PASS
          </span>
        </div>
        
        <table className="w-full">
          <thead>
            <tr className="text-gray-400 border-b border-white/10">
              <th className="text-left py-1 pr-2">PART</th>
              <th className="text-right py-1 px-2">REAL SBC 350</th>
              <th className="text-right py-1 px-2">MODEL VALUE</th>
              <th className="text-center py-1 pl-2">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {dimensions.map((dim, i) => {
              const pass = checkTolerance(dim.realValue, dim.modelValue);
              return (
                <tr key={i} className="border-b border-white/5">
                  <td className="text-gray-300 py-0.5 pr-2">{dim.part}</td>
                  <td className="text-right py-0.5 px-2 text-white">
                    {dim.realValue.toFixed(dim.decimals)}{dim.unit}
                  </td>
                  <td className="text-right py-0.5 px-2 text-cyan-300">
                    {dim.modelValue.toFixed(dim.decimals)}{dim.unit}
                  </td>
                  <td className={`text-center py-0.5 pl-2 font-bold ${pass ? 'text-green-400' : 'text-red-400'}`}>
                    {pass ? 'PASS' : 'FAIL'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div className="mt-2 pt-2 border-t border-cyan-500/20 text-[9px] text-gray-500">
          Tolerance: ±0.1% | Green = within spec
        </div>
      </div>
    </Html>
  );
}
