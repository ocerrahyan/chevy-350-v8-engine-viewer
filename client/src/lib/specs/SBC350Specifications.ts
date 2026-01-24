/**
 * Chevy 350 Small Block V8 Engine Specifications
 * All dimensions in inches unless otherwise noted
 * These are authentic factory specifications for accurate simulation
 */

// ============================================================================
// SCALE FACTOR: Convert inches to Three.js units
// ============================================================================
export const SCALE_FACTOR = 0.086; // 1 inch = 0.086 units

// Helper to convert inches to scaled units
export const toUnits = (inches: number): number => inches * SCALE_FACTOR;

// ============================================================================
// CYLINDER BLOCK SPECIFICATIONS
// ============================================================================
export const BLOCK = {
  // Core dimensions
  DECK_HEIGHT: 9.025,                    // Crank centerline to deck surface
  BORE_DIAMETER: 4.000,                  // Cylinder bore diameter
  BORE_SPACING: 4.400,                   // Center-to-center between cylinders
  V_ANGLE: 90,                           // Degrees between cylinder banks
  BANK_ANGLE: 45,                        // Each bank from vertical (V_ANGLE / 2)
  BANK_OFFSET: 0.3125,                   // Left bank forward offset (authentic SBC spec)
  
  // Lifter bores
  LIFTER_BORE_DIAMETER: 0.8427,          // Lifter bore ID
  LIFTER_BORE_DEPTH: 2.125,              // Approximate depth
  LIFTER_BORE_CLEARANCE: 0.001,          // Lifter-to-bore clearance
  
  // Main bearing housing
  MAIN_HOUSING_BORE: 2.6410,             // Main bearing housing bore (2.6406-2.6415)
  MAIN_CAP_BOLTS: 4,                     // 4-bolt main (performance)
  
  // Freeze plugs
  FREEZE_PLUG_COUNT: 8,
  
  // Oil gallery
  OIL_GALLERY_DIAMETER: 0.500,           // Main oil gallery bore
} as const;

// Scaled block dimensions
export const BLOCK_SCALED = {
  DECK_HEIGHT: toUnits(BLOCK.DECK_HEIGHT),
  BORE_DIAMETER: toUnits(BLOCK.BORE_DIAMETER),
  BORE_SPACING: toUnits(BLOCK.BORE_SPACING),
  BANK_ANGLE_RAD: (BLOCK.BANK_ANGLE * Math.PI) / 180,
  LIFTER_BORE_DIAMETER: toUnits(BLOCK.LIFTER_BORE_DIAMETER),
  BANK_OFFSET: toUnits(BLOCK.BANK_OFFSET),
} as const;

// ============================================================================
// CRANKSHAFT SPECIFICATIONS
// ============================================================================
export const CRANKSHAFT = {
  // Stroke and throw
  STROKE: 3.480,                         // Total piston travel
  CRANK_THROW: 1.740,                    // Stroke / 2 (crank radius)
  
  // Main journals (5 total)
  MAIN_JOURNAL_DIAMETER: 2.4488,         // 2.4484-2.4493 nominal
  MAIN_JOURNAL_WIDTH: 1.000,             // Approximate width
  
  // Rod journals (4 total, 2 rods each)
  ROD_JOURNAL_DIAMETER: 2.100,           // 2.099-2.100 nominal
  ROD_JOURNAL_WIDTH: 1.850,              // Width for 2 rods side-by-side
  
  // Clearances
  MAIN_BEARING_CLEARANCE: 0.0015,        // 0.0008-0.0020
  ROD_BEARING_CLEARANCE: 0.0022,         // 0.0020-0.0025
  END_PLAY: 0.004,                       // 0.002-0.006 thrust clearance
  
  // Cross-plane crankshaft throw angles (degrees)
  THROW_ANGLES: [0, 90, 270, 180],       // Cylinders 1&6, 2&5, 3&8, 4&7
  
  // Counterweight dimensions (approximate)
  COUNTERWEIGHT_RADIUS: 3.5,
  COUNTERWEIGHT_THICKNESS: 0.75,
} as const;

// Scaled crankshaft dimensions
export const CRANKSHAFT_SCALED = {
  STROKE: toUnits(CRANKSHAFT.STROKE),
  CRANK_THROW: toUnits(CRANKSHAFT.CRANK_THROW),
  MAIN_JOURNAL_DIAMETER: toUnits(CRANKSHAFT.MAIN_JOURNAL_DIAMETER),
  MAIN_JOURNAL_RADIUS: toUnits(CRANKSHAFT.MAIN_JOURNAL_DIAMETER / 2),
  ROD_JOURNAL_DIAMETER: toUnits(CRANKSHAFT.ROD_JOURNAL_DIAMETER),
  ROD_JOURNAL_RADIUS: toUnits(CRANKSHAFT.ROD_JOURNAL_DIAMETER / 2),
} as const;

// ============================================================================
// MAIN BEARINGS (5 sets - 10 shells)
// ============================================================================
export const MAIN_BEARINGS = {
  SHELL_THICKNESS: 0.093,                // 0.092-0.093
  BEARING_WIDTH: 1.002,                  // 1.000-1.003
  HOUSING_BORE: 2.6410,                  // Block bore without bearing
  INSTALLED_ID: 2.4503,                  // With bearing installed (clearance to journal)
  THRUST_BEARING_POSITION: 5,            // #5 rear main is thrust bearing
} as const;

// ============================================================================
// ROD BEARINGS (8 sets - 16 shells)
// ============================================================================
export const ROD_BEARINGS = {
  SHELL_THICKNESS: 0.062,                // Approximate
  JOURNAL_DIAMETER: 2.100,
  INSTALLED_ID: 2.1022,                  // With bearing (clearance)
  SIDE_CLEARANCE: 0.018,                 // 0.015-0.021 per rod pair
} as const;

// ============================================================================
// CONNECTING RODS (8)
// ============================================================================
export const CONNECTING_ROD = {
  // Length
  LENGTH: 5.700,                         // Center-to-center
  
  // Big end (crank end)
  BIG_END_BORE: 2.225,                   // Housing bore without bearing
  BIG_END_WIDTH: 0.940,                  // Width of big end
  BIG_END_OD: 2.500,                     // Outside diameter approximate
  
  // Small end (piston pin end)
  SMALL_END_BORE: 0.927,                 // Pin bore (press fit or floating)
  SMALL_END_WIDTH: 0.940,                // Width of small end
  SMALL_END_OD: 1.250,                   // Outside diameter approximate
  
  // Beam dimensions
  BEAM_WIDTH: 0.600,                     // I-beam width
  BEAM_THICKNESS: 0.350,                 // I-beam thickness
  
  // Clearances
  SIDE_CLEARANCE: 0.018,                 // Per pair on rod journal
  
  // Material: 1038 mild steel (stock), 4340 forged (performance)
  ROD_STROKE_RATIO: 1.637,               // 5.700 / 3.480
} as const;

// Scaled connecting rod dimensions
export const CONNECTING_ROD_SCALED = {
  LENGTH: toUnits(CONNECTING_ROD.LENGTH),
  BIG_END_BORE: toUnits(CONNECTING_ROD.BIG_END_BORE),
  BIG_END_OD: toUnits(CONNECTING_ROD.BIG_END_OD),
  SMALL_END_BORE: toUnits(CONNECTING_ROD.SMALL_END_BORE),
  SMALL_END_OD: toUnits(CONNECTING_ROD.SMALL_END_OD),
  BEAM_WIDTH: toUnits(CONNECTING_ROD.BEAM_WIDTH),
} as const;

// ============================================================================
// PISTONS (8)
// ============================================================================
export const PISTON = {
  // Diameter
  DIAMETER: 3.996,                       // Forged piston (0.004" under bore)
  BORE_CLEARANCE: 0.005,                 // 0.004-0.006 for forged
  
  // Pin
  WRIST_PIN_DIAMETER: 0.927,             // Standard SBC pin
  WRIST_PIN_LENGTH: 2.950,               // Approximate
  WRIST_PIN_CLEARANCE: 0.0005,           // Press fit or floating
  
  // Heights
  COMPRESSION_HEIGHT: 1.550,             // Pin center to crown
  SKIRT_LENGTH: 1.200,                   // Below pin center
  OVERALL_HEIGHT: 2.750,                 // Crown to skirt bottom (approximate)
  
  // Deck clearance
  DECK_CLEARANCE: 0.025,                 // Piston to deck at TDC
  
  // Ring groove positions (from crown)
  RING_GROOVE_1_POSITION: 0.250,         // Top compression ring
  RING_GROOVE_2_POSITION: 0.375,         // Second compression ring
  RING_GROOVE_3_POSITION: 0.550,         // Oil ring
  
  // Valve relief depth
  VALVE_RELIEF_DEPTH: 0.100,             // For valve clearance
} as const;

// Scaled piston dimensions
export const PISTON_SCALED = {
  DIAMETER: toUnits(PISTON.DIAMETER),
  RADIUS: toUnits(PISTON.DIAMETER / 2),
  WRIST_PIN_DIAMETER: toUnits(PISTON.WRIST_PIN_DIAMETER),
  COMPRESSION_HEIGHT: toUnits(PISTON.COMPRESSION_HEIGHT),
  OVERALL_HEIGHT: toUnits(PISTON.OVERALL_HEIGHT),
} as const;

// ============================================================================
// PISTON RINGS (24 total - 3 per piston)
// ============================================================================
export const PISTON_RINGS = {
  // Ring gaps (at 4.000" bore)
  TOP_RING_GAP: 0.018,                   // 0.016-0.020
  SECOND_RING_GAP: 0.020,                // 0.018-0.022
  OIL_RING_GAP: 0.020,                   // 0.015-0.025
  
  // Ring widths (groove heights)
  TOP_RING_WIDTH: 0.078,                 // 5/64" = 0.078125
  SECOND_RING_WIDTH: 0.078,              // 5/64"
  OIL_RING_WIDTH: 0.188,                 // 3/16" = 0.1875
  
  // Ring thickness (radial)
  TOP_RING_THICKNESS: 0.140,
  SECOND_RING_THICKNESS: 0.140,
  OIL_RING_THICKNESS: 0.150,
  
  // Ring-to-groove clearance
  SIDE_CLEARANCE: 0.002,                 // 0.001-0.003
} as const;

// Scaled ring dimensions
export const PISTON_RINGS_SCALED = {
  TOP_RING_WIDTH: toUnits(PISTON_RINGS.TOP_RING_WIDTH),
  SECOND_RING_WIDTH: toUnits(PISTON_RINGS.SECOND_RING_WIDTH),
  OIL_RING_WIDTH: toUnits(PISTON_RINGS.OIL_RING_WIDTH),
  TOP_RING_THICKNESS: toUnits(PISTON_RINGS.TOP_RING_THICKNESS),
} as const;

// ============================================================================
// CAMSHAFT
// ============================================================================
export const CAMSHAFT = {
  // Journals (5 total)
  JOURNAL_DIAMETER: 1.868,               // 1.8682-1.8692
  JOURNAL_WIDTH: 0.750,                  // Approximate
  
  // Base circle and lobes
  BASE_CIRCLE_DIAMETER: 1.260,           // OE roller cam
  LOBE_LIFT_INTAKE: 0.382,               // Stock flat tappet
  LOBE_LIFT_EXHAUST: 0.402,              // Stock flat tappet
  
  // Position
  HEIGHT_FROM_CRANK: 4.521,              // Centerline to centerline
  
  // Timing
  DURATION_INTAKE: 194,                  // Degrees @ 0.050" lift
  DURATION_EXHAUST: 202,
  LOBE_SEPARATION: 112,                  // Degrees
  
  // Speed ratio
  SPEED_RATIO: 0.5,                      // Cam runs at 1/2 crank speed
} as const;

// Scaled camshaft dimensions
export const CAMSHAFT_SCALED = {
  JOURNAL_DIAMETER: toUnits(CAMSHAFT.JOURNAL_DIAMETER),
  JOURNAL_RADIUS: toUnits(CAMSHAFT.JOURNAL_DIAMETER / 2),
  BASE_CIRCLE_DIAMETER: toUnits(CAMSHAFT.BASE_CIRCLE_DIAMETER),
  BASE_CIRCLE_RADIUS: toUnits(CAMSHAFT.BASE_CIRCLE_DIAMETER / 2),
  HEIGHT_FROM_CRANK: toUnits(CAMSHAFT.HEIGHT_FROM_CRANK),
  LOBE_LIFT_INTAKE: toUnits(CAMSHAFT.LOBE_LIFT_INTAKE),
  LOBE_LIFT_EXHAUST: toUnits(CAMSHAFT.LOBE_LIFT_EXHAUST),
} as const;

// ============================================================================
// CAM BEARINGS (5)
// ============================================================================
export const CAM_BEARINGS = {
  // Block bores (stepped - 3 sizes)
  BLOCK_BORE_1: 2.020,                   // Front (#1)
  BLOCK_BORE_2_5: 2.010,                 // #2 and #5
  BLOCK_BORE_3_4: 2.000,                 // #3 and #4
  
  // Bearing dimensions
  BEARING_ID: 1.869,                     // Installed ID
  BEARING_THICKNESS: 0.075,              // Approximate shell thickness
  BEARING_WIDTH: 1.000,
  
  // Clearance
  BEARING_CLEARANCE: 0.001,              // Journal to bearing
} as const;

// ============================================================================
// LIFTERS (16)
// ============================================================================
export const LIFTERS = {
  // Dimensions
  BODY_DIAMETER: 0.842,                  // 0.8425
  OVERALL_HEIGHT: 2.000,
  
  // Clearance
  BORE_CLEARANCE: 0.001,                 // 0.0005-0.002
  
  // Oil metering
  OIL_HOLE_DIAMETER: 0.060,              // Approximate metering hole
  
  // Type: Hydraulic Flat Tappet
  PRELOAD: 0.020,                        // Plunger preload
} as const;

// Scaled lifter dimensions
export const LIFTERS_SCALED = {
  BODY_DIAMETER: toUnits(LIFTERS.BODY_DIAMETER),
  BODY_RADIUS: toUnits(LIFTERS.BODY_DIAMETER / 2),
  OVERALL_HEIGHT: toUnits(LIFTERS.OVERALL_HEIGHT),
} as const;

// ============================================================================
// TIMING CHAIN & GEARS
// ============================================================================
export const TIMING_CHAIN = {
  // Gear teeth
  CRANK_GEAR_TEETH: 24,
  CAM_GEAR_TEETH: 42,
  GEAR_RATIO: 2.0,                       // 42/24 ≈ 1.75, but effective is 2:1
  
  // Chain specs
  CHAIN_PITCH: 0.375,                    // 3/8" roller chain
  CHAIN_LINKS: 52,                       // Approximate
  CHAIN_WIDTH: 0.375,
  
  // Center distance
  CENTER_DISTANCE: 4.521,                // Same as cam height from crank
  
  // Gear diameters (approximate from pitch and teeth)
  CRANK_GEAR_PD: 2.865,                  // Pitch diameter
  CAM_GEAR_PD: 5.013,                    // Pitch diameter
} as const;

// Scaled timing chain dimensions
export const TIMING_CHAIN_SCALED = {
  CRANK_GEAR_PD: toUnits(TIMING_CHAIN.CRANK_GEAR_PD),
  CAM_GEAR_PD: toUnits(TIMING_CHAIN.CAM_GEAR_PD),
  CENTER_DISTANCE: toUnits(TIMING_CHAIN.CENTER_DISTANCE),
  CHAIN_PITCH: toUnits(TIMING_CHAIN.CHAIN_PITCH),
} as const;

// ============================================================================
// PUSHRODS (16)
// ============================================================================
export const PUSHRODS = {
  LENGTH: 7.800,                         // 7.794-7.818 for flat tappet
  DIAMETER: 0.3125,                      // 5/16"
  WALL_THICKNESS: 0.080,                 // Performance pushrods
  TIP_RADIUS: 0.156,                     // Ball end radius
} as const;

// Scaled pushrod dimensions
export const PUSHRODS_SCALED = {
  LENGTH: toUnits(PUSHRODS.LENGTH),
  DIAMETER: toUnits(PUSHRODS.DIAMETER),
  RADIUS: toUnits(PUSHRODS.DIAMETER / 2),
} as const;

// ============================================================================
// ROCKER ARMS (16)
// ============================================================================
export const ROCKER_ARMS = {
  RATIO: 1.5,                            // Stock ratio
  STUD_DIAMETER: 0.375,                  // 3/8" studs
  STUD_HEIGHT: 1.250,                    // Above head deck
  
  // Rocker dimensions
  ARM_LENGTH: 2.000,                     // Total length approximate
  PUSHROD_CUP_DEPTH: 0.125,
  VALVE_TIP_PAD_WIDTH: 0.375,
  PIVOT_BALL_DIAMETER: 0.625,
  
  // Motion limits
  MAX_DEFLECTION_RAD: 0.18,              // Maximum angular deflection
} as const;

// Scaled rocker arm dimensions
export const ROCKER_ARMS_SCALED = {
  ARM_LENGTH: toUnits(ROCKER_ARMS.ARM_LENGTH),
  PIVOT_BALL_DIAMETER: toUnits(ROCKER_ARMS.PIVOT_BALL_DIAMETER),
  STUD_HEIGHT: toUnits(ROCKER_ARMS.STUD_HEIGHT),
} as const;

// ============================================================================
// VALVES (16 - 8 intake, 8 exhaust)
// ============================================================================
export const VALVES = {
  // Head diameters
  INTAKE_HEAD_DIAMETER: 1.940,
  EXHAUST_HEAD_DIAMETER: 1.500,
  
  // Stem dimensions
  STEM_DIAMETER: 0.3437,                 // 11/32"
  STEM_LENGTH: 4.910,                    // Overall length
  
  // Valve lift (with 1.5:1 rockers)
  INTAKE_LIFT: 0.573,                    // 0.382 × 1.5
  EXHAUST_LIFT: 0.603,                   // 0.402 × 1.5
  MAX_LIFT: 0.600,                       // Clamped maximum
  
  // Clearances
  STEM_TO_GUIDE_CLEARANCE: 0.002,        // 0.001-0.003
  
  // Angles
  VALVE_ANGLE: 23,                       // Degrees from vertical (typical SBC)
  
  // Margin (face thickness)
  INTAKE_MARGIN: 0.050,
  EXHAUST_MARGIN: 0.060,
} as const;

// Scaled valve dimensions
export const VALVES_SCALED = {
  INTAKE_HEAD_DIAMETER: toUnits(VALVES.INTAKE_HEAD_DIAMETER),
  INTAKE_HEAD_RADIUS: toUnits(VALVES.INTAKE_HEAD_DIAMETER / 2),
  EXHAUST_HEAD_DIAMETER: toUnits(VALVES.EXHAUST_HEAD_DIAMETER),
  EXHAUST_HEAD_RADIUS: toUnits(VALVES.EXHAUST_HEAD_DIAMETER / 2),
  STEM_DIAMETER: toUnits(VALVES.STEM_DIAMETER),
  STEM_RADIUS: toUnits(VALVES.STEM_DIAMETER / 2),
  STEM_LENGTH: toUnits(VALVES.STEM_LENGTH),
  INTAKE_LIFT: toUnits(VALVES.INTAKE_LIFT),
  EXHAUST_LIFT: toUnits(VALVES.EXHAUST_LIFT),
  MAX_LIFT: toUnits(VALVES.MAX_LIFT),
} as const;

// ============================================================================
// VALVE SPRINGS (16)
// ============================================================================
export const VALVE_SPRINGS = {
  // Installed dimensions
  INSTALLED_HEIGHT: 1.700,
  FREE_LENGTH: 2.100,                    // Approximate
  
  // Coil dimensions
  OUTER_DIAMETER: 1.250,
  WIRE_DIAMETER: 0.150,
  COIL_COUNT: 6,
  
  // Pressures (pounds)
  SEAT_PRESSURE: 85,                     // At installed height
  OPEN_PRESSURE: 190,                    // At full lift
  
  // Safety
  COIL_BIND_HEIGHT: 1.100,               // Minimum before bind
  COIL_BIND_CLEARANCE: 0.060,            // Minimum clearance to bind
} as const;

// Scaled spring dimensions
export const VALVE_SPRINGS_SCALED = {
  INSTALLED_HEIGHT: toUnits(VALVE_SPRINGS.INSTALLED_HEIGHT),
  OUTER_DIAMETER: toUnits(VALVE_SPRINGS.OUTER_DIAMETER),
  OUTER_RADIUS: toUnits(VALVE_SPRINGS.OUTER_DIAMETER / 2),
} as const;

// ============================================================================
// VALVE GUIDES (16)
// ============================================================================
export const VALVE_GUIDES = {
  INSIDE_DIAMETER: 0.3437,               // Match stem diameter + clearance
  OUTSIDE_DIAMETER: 0.500,               // Press-fit OD
  LENGTH: 2.000,                         // Approximate
  CLEARANCE: 0.002,                      // 0.001-0.003
} as const;

// ============================================================================
// CYLINDER HEADS
// ============================================================================
export const CYLINDER_HEADS = {
  // Combustion chamber
  CHAMBER_VOLUME_CC: 64,                 // Vortec style
  CHAMBER_DIAMETER: 4.000,               // Matches bore
  CHAMBER_DEPTH: 0.400,                  // Approximate chamber depth
  
  // Ports - SBC 350 Vortec rectangular runners
  INTAKE_PORT_VOLUME_CC: 170,
  EXHAUST_PORT_VOLUME_CC: 60,
  INTAKE_PORT_WIDTH: 1.940,              // Approximate (matches valve)
  INTAKE_PORT_HEIGHT: 2.000,             // Rectangular runner height
  EXHAUST_PORT_WIDTH: 1.500,             // Approximate (matches valve)
  EXHAUST_PORT_HEIGHT: 1.600,            // Rectangular runner height
  PORT_RUNNER_LENGTH: 3.500,             // Approximate runner length
  
  // Valve seats
  INTAKE_SEAT_ANGLE: 45,                 // Degrees
  EXHAUST_SEAT_ANGLE: 45,
  INTAKE_SEAT_WIDTH: 0.060,
  EXHAUST_SEAT_WIDTH: 0.080,
  
  // Spark plug
  SPARK_PLUG_THREAD: 0.5625,             // 14mm = 0.551"
  SPARK_PLUG_REACH: 0.750,
  
  // Head bolt pattern (SBC 350 uses 17 bolts per head)
  HEAD_BOLT_COUNT: 17,                   // Per head
  HEAD_BOLT_DIAMETER: 0.500,             // 1/2" bolts
  HEAD_BOLT_BOSS_OD: 0.875,              // Boss outside diameter
  
  // Rocker studs (8 per head - 1 per valve)
  ROCKER_STUD_DIAMETER: 0.4375,          // 7/16" studs on performance heads
  ROCKER_STUD_COUNT: 8,                  // Per head (16 total)
  ROCKER_STUD_HEIGHT: 1.250,             // Height above deck
} as const;

// Scaled cylinder head dimensions
export const CYLINDER_HEADS_SCALED = {
  CHAMBER_DIAMETER: toUnits(CYLINDER_HEADS.CHAMBER_DIAMETER),
  CHAMBER_RADIUS: toUnits(CYLINDER_HEADS.CHAMBER_DIAMETER / 2),
  CHAMBER_DEPTH: toUnits(CYLINDER_HEADS.CHAMBER_DEPTH),
  INTAKE_PORT_WIDTH: toUnits(CYLINDER_HEADS.INTAKE_PORT_WIDTH),
  INTAKE_PORT_HEIGHT: toUnits(CYLINDER_HEADS.INTAKE_PORT_HEIGHT),
  EXHAUST_PORT_WIDTH: toUnits(CYLINDER_HEADS.EXHAUST_PORT_WIDTH),
  EXHAUST_PORT_HEIGHT: toUnits(CYLINDER_HEADS.EXHAUST_PORT_HEIGHT),
  HEAD_BOLT_DIAMETER: toUnits(CYLINDER_HEADS.HEAD_BOLT_DIAMETER),
  HEAD_BOLT_BOSS_OD: toUnits(CYLINDER_HEADS.HEAD_BOLT_BOSS_OD),
  ROCKER_STUD_DIAMETER: toUnits(CYLINDER_HEADS.ROCKER_STUD_DIAMETER),
  ROCKER_STUD_HEIGHT: toUnits(CYLINDER_HEADS.ROCKER_STUD_HEIGHT),
} as const;

// Scaled valve guide dimensions
export const VALVE_GUIDES_SCALED = {
  INSIDE_DIAMETER: toUnits(VALVE_GUIDES.INSIDE_DIAMETER),
  OUTSIDE_DIAMETER: toUnits(VALVE_GUIDES.OUTSIDE_DIAMETER),
  OUTSIDE_RADIUS: toUnits(VALVE_GUIDES.OUTSIDE_DIAMETER / 2),
  LENGTH: toUnits(VALVE_GUIDES.LENGTH),
  PROTRUSION: toUnits(0.500),            // Visible protrusion above spring seat
} as const;

// ============================================================================
// FIRING ORDER & CYLINDER LAYOUT
// ============================================================================
export const ENGINE_LAYOUT = {
  // Firing order
  FIRING_ORDER: [1, 8, 4, 3, 6, 5, 7, 2],
  
  // Cylinder numbering (driver side = odd, passenger = even)
  // Right bank (passenger): 2, 4, 6, 8 (front to rear)
  // Left bank (driver): 1, 3, 5, 7 (front to rear)
  
  // Cylinder positions (Z-axis, from front of block)
  CYLINDER_Z_POSITIONS: [
    0,                                   // Cylinders 1 & 2
    BLOCK.BORE_SPACING,                  // Cylinders 3 & 4
    BLOCK.BORE_SPACING * 2,              // Cylinders 5 & 6
    BLOCK.BORE_SPACING * 3,              // Cylinders 7 & 8
  ],
  
  // Crank throw assignments
  // Throw 1 (0°): Cylinders 1 & 6
  // Throw 2 (90°): Cylinders 8 & 5 (note: 8 is actually 270° adjusted for bank)
  // Throw 3 (180°): Cylinders 4 & 7
  // Throw 4 (270°): Cylinders 3 & 2
} as const;

// Scaled cylinder positions
export const ENGINE_LAYOUT_SCALED = {
  CYLINDER_Z_POSITIONS: ENGINE_LAYOUT.CYLINDER_Z_POSITIONS.map(z => toUnits(z)),
} as const;

// ============================================================================
// INTAKE MANIFOLD (Stock Cast Iron / Aluminum Dual-Plane)
// ============================================================================
export const INTAKE_MANIFOLD = {
  // Overall dimensions
  LENGTH: 18.500,                        // Front to rear
  WIDTH: 8.250,                          // Across lifter valley
  HEIGHT: 4.500,                         // Valley floor to carb pad
  
  // V-shape valley fit
  VALLEY_ANGLE: 45,                      // Matches 90° V-angle (45° per side)
  VALLEY_FLOOR_WIDTH: 3.000,             // Width at crankcase
  VALLEY_TOP_WIDTH: 7.500,               // Width at deck level
  
  // Runner dimensions (8 total - 4 per bank)
  RUNNER_OUTLET_WIDTH: 1.750,            // At head port
  RUNNER_OUTLET_HEIGHT: 1.250,           // Rectangular port
  RUNNER_LENGTH: 9.500,                  // Plenum to port centerline
  RUNNER_SPACING: 4.400,                 // Matches bore spacing
  
  // Carburetor pad (Rochester Quadrajet spread-bore pattern)
  CARB_PAD_LENGTH: 5.375,                // Front-to-rear
  CARB_PAD_WIDTH: 5.375,                 // Side-to-side (square pattern)
  PRIMARY_BORE_SPACING: 2.375,           // Primary bore center-to-center
  SECONDARY_BORE_SPACING: 4.000,         // Secondary bore center-to-center
  CARB_STUD_SPACING_LENGTH: 4.250,       // Mounting stud spacing
  CARB_STUD_SPACING_WIDTH: 4.250,
  
  // Thermostat housing boss (front)
  THERMOSTAT_BOSS_DIAMETER: 2.250,
  THERMOSTAT_OPENING_DIAMETER: 1.500,    // For 180° thermostat
  THERMOSTAT_BOSS_HEIGHT: 1.000,
  
  // Water crossover passage
  WATER_CROSSOVER_WIDTH: 1.000,
  WATER_CROSSOVER_DEPTH: 0.750,
  
  // Mounting bolt pattern
  MANIFOLD_BOLT_COUNT: 12,               // 6 per head
  MANIFOLD_BOLT_DIAMETER: 0.375,         // 3/8" bolts
} as const;

// Scaled intake manifold dimensions
export const INTAKE_MANIFOLD_SCALED = {
  LENGTH: toUnits(INTAKE_MANIFOLD.LENGTH),
  WIDTH: toUnits(INTAKE_MANIFOLD.WIDTH),
  HEIGHT: toUnits(INTAKE_MANIFOLD.HEIGHT),
  VALLEY_ANGLE_RAD: (INTAKE_MANIFOLD.VALLEY_ANGLE * Math.PI) / 180,
  VALLEY_FLOOR_WIDTH: toUnits(INTAKE_MANIFOLD.VALLEY_FLOOR_WIDTH),
  VALLEY_TOP_WIDTH: toUnits(INTAKE_MANIFOLD.VALLEY_TOP_WIDTH),
  RUNNER_OUTLET_WIDTH: toUnits(INTAKE_MANIFOLD.RUNNER_OUTLET_WIDTH),
  RUNNER_OUTLET_HEIGHT: toUnits(INTAKE_MANIFOLD.RUNNER_OUTLET_HEIGHT),
  RUNNER_LENGTH: toUnits(INTAKE_MANIFOLD.RUNNER_LENGTH),
  CARB_PAD_LENGTH: toUnits(INTAKE_MANIFOLD.CARB_PAD_LENGTH),
  CARB_PAD_WIDTH: toUnits(INTAKE_MANIFOLD.CARB_PAD_WIDTH),
  PRIMARY_BORE_SPACING: toUnits(INTAKE_MANIFOLD.PRIMARY_BORE_SPACING),
  SECONDARY_BORE_SPACING: toUnits(INTAKE_MANIFOLD.SECONDARY_BORE_SPACING),
  THERMOSTAT_BOSS_DIAMETER: toUnits(INTAKE_MANIFOLD.THERMOSTAT_BOSS_DIAMETER),
  THERMOSTAT_OPENING_DIAMETER: toUnits(INTAKE_MANIFOLD.THERMOSTAT_OPENING_DIAMETER),
  THERMOSTAT_BOSS_HEIGHT: toUnits(INTAKE_MANIFOLD.THERMOSTAT_BOSS_HEIGHT),
  WATER_CROSSOVER_WIDTH: toUnits(INTAKE_MANIFOLD.WATER_CROSSOVER_WIDTH),
  WATER_CROSSOVER_DEPTH: toUnits(INTAKE_MANIFOLD.WATER_CROSSOVER_DEPTH),
} as const;

// ============================================================================
// ROCHESTER QUADRAJET CARBURETOR (750 CFM)
// ============================================================================
export const CARBURETOR = {
  // Overall dimensions
  OVERALL_LENGTH: 5.375,                 // Front to rear
  OVERALL_WIDTH: 5.375,                  // Side to side
  OVERALL_HEIGHT: 4.500,                 // Base to air horn top
  
  // Throttle bores (spread-bore design)
  PRIMARY_BORE_DIAMETER: 1.406,          // 1-7/16" small primaries
  SECONDARY_BORE_DIAMETER: 2.250,        // 2-1/4" large secondaries
  PRIMARY_BORE_SPACING: 2.375,           // Center-to-center
  SECONDARY_BORE_SPACING: 4.000,
  
  // Air horn (top section)
  AIR_HORN_HEIGHT: 1.500,
  AIR_HORN_LENGTH: 4.750,
  AIR_HORN_WIDTH: 4.750,
  AIR_CLEANER_STUD_DIAMETER: 0.3125,     // 5/16" stud
  
  // Float bowl (main body)
  FLOAT_BOWL_HEIGHT: 2.000,
  FLOAT_BOWL_LENGTH: 5.250,
  FLOAT_BOWL_WIDTH: 5.250,
  
  // Throttle body (base plate)
  THROTTLE_BODY_HEIGHT: 1.000,
  THROTTLE_BODY_LENGTH: 5.375,
  THROTTLE_BODY_WIDTH: 5.375,
  
  // Fuel inlet (driver side - 3/8" inverted flare)
  FUEL_INLET_DIAMETER: 0.375,
  FUEL_INLET_OFFSET_X: -2.500,           // Driver side
  FUEL_INLET_HEIGHT: 1.500,              // From base
  FUEL_FILTER_LENGTH: 1.250,
  
  // Throttle linkage (passenger side)
  THROTTLE_LEVER_OFFSET_X: 2.500,        // Passenger side
  THROTTLE_LEVER_HEIGHT: 0.500,
  THROTTLE_LEVER_LENGTH: 2.000,
  
  // CFM rating
  CFM_RATING: 750,                       // Primary + secondary flow
  PRIMARY_CFM: 300,                      // At full throttle
  SECONDARY_CFM: 450,                    // Vacuum operated
} as const;

// Scaled carburetor dimensions
export const CARBURETOR_SCALED = {
  OVERALL_LENGTH: toUnits(CARBURETOR.OVERALL_LENGTH),
  OVERALL_WIDTH: toUnits(CARBURETOR.OVERALL_WIDTH),
  OVERALL_HEIGHT: toUnits(CARBURETOR.OVERALL_HEIGHT),
  PRIMARY_BORE_DIAMETER: toUnits(CARBURETOR.PRIMARY_BORE_DIAMETER),
  SECONDARY_BORE_DIAMETER: toUnits(CARBURETOR.SECONDARY_BORE_DIAMETER),
  PRIMARY_BORE_RADIUS: toUnits(CARBURETOR.PRIMARY_BORE_DIAMETER / 2),
  SECONDARY_BORE_RADIUS: toUnits(CARBURETOR.SECONDARY_BORE_DIAMETER / 2),
  PRIMARY_BORE_SPACING: toUnits(CARBURETOR.PRIMARY_BORE_SPACING),
  SECONDARY_BORE_SPACING: toUnits(CARBURETOR.SECONDARY_BORE_SPACING),
  AIR_HORN_HEIGHT: toUnits(CARBURETOR.AIR_HORN_HEIGHT),
  FLOAT_BOWL_HEIGHT: toUnits(CARBURETOR.FLOAT_BOWL_HEIGHT),
  THROTTLE_BODY_HEIGHT: toUnits(CARBURETOR.THROTTLE_BODY_HEIGHT),
  FUEL_INLET_DIAMETER: toUnits(CARBURETOR.FUEL_INLET_DIAMETER),
  FUEL_INLET_OFFSET_X: toUnits(CARBURETOR.FUEL_INLET_OFFSET_X),
  FUEL_FILTER_LENGTH: toUnits(CARBURETOR.FUEL_FILTER_LENGTH),
  THROTTLE_LEVER_OFFSET_X: toUnits(CARBURETOR.THROTTLE_LEVER_OFFSET_X),
  THROTTLE_LEVER_LENGTH: toUnits(CARBURETOR.THROTTLE_LEVER_LENGTH),
  AIR_CLEANER_STUD_DIAMETER: toUnits(CARBURETOR.AIR_CLEANER_STUD_DIAMETER),
} as const;

// ============================================================================
// HEI DISTRIBUTOR (High Energy Ignition)
// ============================================================================
export const DISTRIBUTOR = {
  // Position (rear of block, driven by camshaft)
  DRIVE_GEAR_DIAMETER: 0.500,            // Cam gear engagement
  SHAFT_DIAMETER: 0.491,                 // Distributor shaft
  SHAFT_LENGTH: 6.500,                   // Total shaft length
  
  // Housing (lower section in block)
  HOUSING_DIAMETER: 1.000,
  HOUSING_LENGTH: 4.000,
  
  // HEI cap (large diameter for internal coil)
  CAP_DIAMETER: 4.750,                   // HEI is much larger than points cap
  CAP_HEIGHT: 2.250,                     // Taller for integrated coil
  CAP_DOME_RADIUS: 2.000,
  
  // Spark plug terminals (8 around perimeter)
  TERMINAL_COUNT: 8,
  TERMINAL_DIAMETER: 0.375,              // Boot terminal OD
  TERMINAL_RADIUS: 2.000,                // Distance from center
  
  // Coil terminal (center, HEI has coil in cap)
  COIL_TERMINAL_DIAMETER: 0.750,
  COIL_CONNECTOR_WIDTH: 1.500,           // For tach/power connection
  
  // Rotor
  ROTOR_DIAMETER: 2.500,
  ROTOR_HEIGHT: 0.750,
  
  // Vacuum advance canister
  VACUUM_CANISTER_DIAMETER: 2.000,
  VACUUM_CANISTER_LENGTH: 2.500,
  VACUUM_CANISTER_OFFSET_ANGLE: 45,      // Degrees from front
  VACUUM_HOSE_DIAMETER: 0.250,
  
  // Hold-down clamp
  CLAMP_WIDTH: 1.500,
  CLAMP_LENGTH: 3.000,
  CLAMP_BOLT_DIAMETER: 0.375,            // 3/8" hold-down bolt
  
  // Timing
  MECHANICAL_ADVANCE_TOTAL: 24,          // Degrees mechanical advance
  VACUUM_ADVANCE_TOTAL: 12,              // Degrees vacuum advance
} as const;

// Scaled distributor dimensions
export const DISTRIBUTOR_SCALED = {
  DRIVE_GEAR_DIAMETER: toUnits(DISTRIBUTOR.DRIVE_GEAR_DIAMETER),
  SHAFT_DIAMETER: toUnits(DISTRIBUTOR.SHAFT_DIAMETER),
  SHAFT_LENGTH: toUnits(DISTRIBUTOR.SHAFT_LENGTH),
  HOUSING_DIAMETER: toUnits(DISTRIBUTOR.HOUSING_DIAMETER),
  HOUSING_LENGTH: toUnits(DISTRIBUTOR.HOUSING_LENGTH),
  CAP_DIAMETER: toUnits(DISTRIBUTOR.CAP_DIAMETER),
  CAP_RADIUS: toUnits(DISTRIBUTOR.CAP_DIAMETER / 2),
  CAP_HEIGHT: toUnits(DISTRIBUTOR.CAP_HEIGHT),
  CAP_DOME_RADIUS: toUnits(DISTRIBUTOR.CAP_DOME_RADIUS),
  TERMINAL_DIAMETER: toUnits(DISTRIBUTOR.TERMINAL_DIAMETER),
  TERMINAL_RADIUS: toUnits(DISTRIBUTOR.TERMINAL_RADIUS),
  ROTOR_DIAMETER: toUnits(DISTRIBUTOR.ROTOR_DIAMETER),
  ROTOR_HEIGHT: toUnits(DISTRIBUTOR.ROTOR_HEIGHT),
  VACUUM_CANISTER_DIAMETER: toUnits(DISTRIBUTOR.VACUUM_CANISTER_DIAMETER),
  VACUUM_CANISTER_LENGTH: toUnits(DISTRIBUTOR.VACUUM_CANISTER_LENGTH),
  VACUUM_CANISTER_ANGLE_RAD: (DISTRIBUTOR.VACUUM_CANISTER_OFFSET_ANGLE * Math.PI) / 180,
  VACUUM_HOSE_DIAMETER: toUnits(DISTRIBUTOR.VACUUM_HOSE_DIAMETER),
  CLAMP_WIDTH: toUnits(DISTRIBUTOR.CLAMP_WIDTH),
  CLAMP_LENGTH: toUnits(DISTRIBUTOR.CLAMP_LENGTH),
  CLAMP_BOLT_DIAMETER: toUnits(DISTRIBUTOR.CLAMP_BOLT_DIAMETER),
} as const;

// ============================================================================
// MATERIAL COLORS (for visualization)
// ============================================================================
export const MATERIAL_COLORS = {
  CAST_IRON: 0x3a3a3a,                   // Block, heads, exhaust manifolds
  FORGED_STEEL: 0x5a5a5a,                // Crankshaft, connecting rods
  ALUMINUM: 0xa8a8a8,                    // Pistons
  BEARING_BRONZE: 0xcd7f32,              // Bearings
  VALVE_STEEL: 0x707070,                 // Valves
  SPRING_STEEL: 0x4a4a4a,                // Valve springs
  TIMING_CHAIN: 0x2a2a2a,                // Chain links
} as const;

// ============================================================================
// PHYSICS CONSTANTS
// ============================================================================
export const PHYSICS = {
  // Masses (approximate, in pounds)
  PISTON_MASS_LBS: 1.2,
  PIN_MASS_LBS: 0.25,
  RING_MASS_LBS: 0.1,
  ROD_RECIPROCATING_MASS_LBS: 0.5,       // Small end portion
  ROD_ROTATING_MASS_LBS: 0.8,            // Big end portion
  
  // Rotating inertia (approximate, lb-ft²)
  CRANKSHAFT_INERTIA: 0.15,
  FLYWHEEL_INERTIA: 0.8,
  
  // Compression ratio
  COMPRESSION_RATIO: 9.5,
} as const;

// ============================================================================
// EXPORT ALL SPECIFICATIONS
// ============================================================================
export const SBC350_SPECS = {
  SCALE_FACTOR,
  toUnits,
  BLOCK,
  BLOCK_SCALED,
  CRANKSHAFT,
  CRANKSHAFT_SCALED,
  MAIN_BEARINGS,
  ROD_BEARINGS,
  CONNECTING_ROD,
  CONNECTING_ROD_SCALED,
  PISTON,
  PISTON_SCALED,
  PISTON_RINGS,
  PISTON_RINGS_SCALED,
  CAMSHAFT,
  CAMSHAFT_SCALED,
  CAM_BEARINGS,
  LIFTERS,
  LIFTERS_SCALED,
  TIMING_CHAIN,
  TIMING_CHAIN_SCALED,
  PUSHRODS,
  PUSHRODS_SCALED,
  ROCKER_ARMS,
  ROCKER_ARMS_SCALED,
  VALVES,
  VALVES_SCALED,
  VALVE_SPRINGS,
  VALVE_SPRINGS_SCALED,
  VALVE_GUIDES,
  VALVE_GUIDES_SCALED,
  CYLINDER_HEADS,
  CYLINDER_HEADS_SCALED,
  ENGINE_LAYOUT,
  ENGINE_LAYOUT_SCALED,
  INTAKE_MANIFOLD,
  INTAKE_MANIFOLD_SCALED,
  CARBURETOR,
  CARBURETOR_SCALED,
  DISTRIBUTOR,
  DISTRIBUTOR_SCALED,
  MATERIAL_COLORS,
  PHYSICS,
} as const;

export default SBC350_SPECS;
