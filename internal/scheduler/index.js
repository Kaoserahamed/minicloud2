class Scheduler {
  constructor(options = {}) {
    this.strategy = options.strategy || 'bin-packing';
  }

  place(instance, nodes) {
    if (this.strategy === 'bin-packing') {
      return this.binPacking(instance, nodes);
    }
    return this.firstFit(instance, nodes);
  }

  binPacking(instance, nodes) {
    const { cpu, ramMb, storageGb } = instance;
    let best = null;
    let bestUtilization = -1;
    for (const node of nodes) {
      const freeCpu = node.cpu_total - node.cpu_used;
      const freeRam = node.ram_total - node.ram_used;
      const freeStorage = node.storage_total - node.storage_used;
      if (freeCpu < cpu || freeRam < ramMb || freeStorage < storageGb) {
        continue;
      }
      const utilization =
        (node.cpu_used + cpu) / node.cpu_total + (node.ram_used + ramMb) / node.ram_total;
      if (best === null || utilization > bestUtilization) {
        best = node;
        bestUtilization = utilization;
      }
    }
    return best;
  }

  firstFit(instance, nodes) {
    const { cpu, ramMb, storageGb } = instance;
    for (const node of nodes) {
      const freeCpu = node.cpu_total - node.cpu_used;
      const freeRam = node.ram_total - node.ram_used;
      const freeStorage = node.storage_total - node.storage_used;
      if (freeCpu >= cpu && freeRam >= ramMb && freeStorage >= storageGb) {
        return node;
      }
    }
    return null;
  }
}

module.exports = { Scheduler };
