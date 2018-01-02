import path from "path";
import fs from "fs";
import SocketIO from "socket.io-client";
import SocketIOFile from "./file-uploader";
import { createTarBundle } from "./create-tar";

function proxifyRunner(benchmarkEntryBundle, runnerConfig, proyectConfig, globalConfig, messager) {
    return new Promise(async (resolve, reject) => {
        const { benchmarkName, benchmarkEntry, benchmarkSignature } = benchmarkEntryBundle;
        const { host, options, remoteRunner } = runnerConfig;
        const bundleDirname = path.dirname(benchmarkEntry);
        const remoteProyectConfig = Object.assign({}, proyectConfig, { benchmarkRunner: remoteRunner });
        const tarBundle = path.resolve(bundleDirname, `${benchmarkName}.tgz`);

        await createTarBundle(bundleDirname, benchmarkName);

        if (!fs.existsSync(tarBundle)) {
            return reject(new Error('Benchmark artifact not found (${tarBundle})'));
        }

        const socket = SocketIO(host, options);
        socket.on('connect', () => {
            socket.emit('benchmark_task', { benchmarkName, benchmarkSignature, proyectConfig: remoteProyectConfig, globalConfig });
        });

        socket.on('load_benchmark', (s) => {
            const uploader = new SocketIOFile(socket);
            uploader.on('ready', () => {
                uploader.upload(tarBundle);
            });
        });

        socket.on('running_benchmark_start', (benchName) => {
            messager.onBenchmarkStart(benchName, {
                displayPath: `${host}/${benchName}`
            });
        });

        socket.on('running_benchmark_update', ({ state, opts }) => {
            messager.updateBenchmarkProgress(state, opts);
        });
        socket.on('running_benchmark_end', (benchName) => {
            messager.onBenchmarkEnd(benchName);
        });

        socket.on('disconnect', (s) => {
            //console.log('Disconnected??');
        });

        socket.on('state_change', (s) => {
            // console.log('>> State change', s);
        });

        socket.on('benchmark_error', (err) => {
            socket.disconnect();
            reject(err);
        });

        socket.on('benchmark_results', ({ results, environment }) => {
            socket.disconnect();
            resolve({ results, environment });
        });
    });
}

export function run(benchmarkEntryBundle, proyectConfig, globalConfig, messager) {
    const { benchmarkRunnerConfig } = proyectConfig;
    return proxifyRunner(benchmarkEntryBundle, benchmarkRunnerConfig, proyectConfig, globalConfig, messager);
}
