const os = require('os');
const cluster = require('cluster');
const goal = 100000;
const cores = os.cpus().length;
let readyCores = 0;
const forks = [];

const onMessage = (message) => {
  if (message.ready && !message.finished) {
    // Wait for all the forks to be ready
    readyCores++;
    if (readyCores === cores) {
      for (const fork of forks) {
        fork.send('start');
      }
    }
  } else if (message.ready && message.finished) {
    console.log(`${message.name} finished the race.`);
  } 
}

// Some cpu intensive task serves as the running track
const race = () => {
  const track = [];
  for (let i = 0; i < goal; i++) {
    track.push(goal - i);
  }
  track.sort();
}

if (cluster.isMaster) {
  // Start up all forks
  for (let i = 0; i < cores; i++) {
    const fork = cluster.fork({ WorkerName: `Worker ${i + 1}` });
    fork.on('message', onMessage);
    forks.push(fork);
  }
} else {
  // Signal the game master that this core is ready to race
  process.send({ ready: true, finished: false, name: process.env.WorkerName });

  process.on('message', (message) => {
    if (message === 'start') {
      // All cores are ready, start the race
      race();
      process.send({ ready: true, finished: true, name: process.env.WorkerName });
      process.exit();
    }
  });
}
