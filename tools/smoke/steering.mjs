import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const window={};
runInNewContext(readFileSync(new URL('../../dist/drivetrain.js',import.meta.url),'utf8'),{window});
const body=window.DriveBody;

function start(kmh) {
  const car={model:'supercar',x:0,z:0,yaw:0,spec:{power:8.4,top:48}};
  body.reset(car);
  car.speed=kmh/3.6;
  car.vz=-car.speed;
  return car;
}

function drive(car,steer,seconds,hz) {
  const input={steer,grade:0,gas:false,power:car.spec.power,top:car.spec.top};
  for(let remaining=seconds;remaining>1e-9;) {
    const frame=Math.min(1/hz,remaining);
    const steps=Math.ceil(frame*90);
    for(let i=0;i<steps;i++)body.step(car,input,frame/steps);
    remaining-=frame;
  }
}

for(const hz of [30,60,100,144]) {
  for(const speed of [-10,0,10,20,40,60,100,150,200]) {
    const right=start(speed),left=start(speed);
    drive(right,1,.1,hz);
    drive(left,-1,.1,hz);
    const tap=right.steer;
    if(Math.abs(speed)<=20)assert.ok(Math.abs(tap-(1-Math.exp(-.8)))<1e-8,'Parking response');
    drive(right,0,.9,hz);
    drive(left,0,.9,hz);
    assert.ok(Math.abs(right.x+left.x)<1e-8,'Left/right symmetry');
    assert.ok(Math.abs(right.steer)<.001,'Released steering returns to centre');
    if(speed>=40)assert.ok(right.x>.1&&right.x<.8,`Lane correction at ${speed} km/h, ${hz} Hz: ${right.x} m`);

    const turn=start(speed);
    drive(turn,1,.6,hz);
    assert.ok(turn.steer>.96,'Sustained turn reaches the available wheel angle');
    drive(turn,-1,.1,hz);
    assert.ok(turn.steer<0,'Countersteering crosses centre within 100 ms');
    body.reset(turn);
    drive(turn,0,.02,hz);
    assert.equal(turn.steer,0,'Restart clears held steering');

    if(speed>=40) {
      const correction=start(speed);
      drive(correction,1,.25,hz);
      drive(correction,-1,.25,hz);
      drive(correction,0,.25,hz);
      assert.ok(Math.abs(correction.yaw)<Math.PI/120,'Equal opposite inputs bring heading back within 1.5 degrees');
    }
  }
}
console.log('PASS steering taps, held turns, release, reversal and reset at 30–144 Hz');
