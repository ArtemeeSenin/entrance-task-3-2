'use strict'
const fs = require('fs')
fs.readFile('./data/input.json', getData)

function getData(err, data) {
    if (err) throw err;
    const input = JSON.parse(data);

    calc(input)
}

function printData(res) {
    fs.writeFile('./data/res.json', res, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
    })
}

function calc(input) {
    const shiftDuration = 0;
    const sortedRates = input.rates.sort((a, b) => a.value - b.value)
    const sortedDevices = input.devices.sort((a, b) => {

        return b.duration - a.duration;
    })

    let output = {
        shedule: {},
        consumedEnergy: {
            value: 0,
            devices: {}
        }
    }
    sortedDevices.map((el) => {
        output.consumedEnergy.devices[el.id] = 0
    })

    const day = {
        from: 7,
        to: 21,
    }

    

    function getRangeModes(rToShift, rFromShift) {
        let rMode = [];
        if (rToShift < rFromShift) {
            rMode = ["day", "night"];
        } else
        if (rToShift <= dayFromShift) {
            rMode = ["night"];
        } else
        if (rFromShift >= dayFromShift) {
            rMode = ["day"];
        } else {
            rMode = ["night", "day"];
        }
        return rMode
    }

    function checkInRangeHours(a, b, c) {
        if (a <= c) {
            return a <= c && c < b;
        } else {
            return a <= c || c < b;
        }
    }

    function rangeToSetHours(a, b) {
        let res = [];
        while (a != b) {
            a = a % 24;
            res.push(a++);
        }
        return res;
    }

    function intersect(a, b) {
        let res = [];
        for (let e of a) {
            if (b.indexOf(e) !== -1) {
                res.push(e);
            }
        }
        return res;
    }

    function rangeIntersectHours(aFrom, aTo, bFrom, bTo) {
        return intersect(rangeToSetHours(aFrom, aTo), rangeToSetHours(bFrom, bTo))
    }

    function normalizeHour(h) {
        return (24 + h) % 24;
    }

    function eOfR(r, pos) {
        let res = [];
        for (let i of pos) {
            res.push(r[i]);
        }
        return res;
    }

    function checkDurationCapacity(d, range, rates, resPower) {
        
        let durations = []
        let currentDuration = {
            gap: 0,
            startPoint: range.from
        };
        let max, i = range.from;
        if(range.from > range.to){            
            max = 23 + range.to
        } else {
            max = range.to
        }
        do {
            if(resPower[normalizeHour(i)] + d.power <= input.maxPower){
                currentDuration.gap++
            } else if(currentDuration.gap >= d.duration) {
                durations.push(currentDuration)
                currentDuration = {
                    gap: 0,
                    startPoint: normalizeHour(i) + 1
                }
            } else {
                currentDuration = {
                    gap: 0,
                    startPoint: normalizeHour(i) + 1
                }
            }
        } while (i++ < max - 1)
        if(currentDuration.gap >= d.duration){
            durations.push(currentDuration)
        }
        return durations;
    }

    function getEconomicalDuration(durations, d, ratesValuesByHours, resPower){

        let minIdx = durations[0].startPoint;
        let min = ratesValuesByHours[minIdx];
        if(d.id == 'F972B82BA56A70CC579945773B6866FB')
        durations.map( (duration) => {
            /* let candidate = Math.min(...(ratesValuesByHours.slice(duration.startPoint, duration.startPoint + duration.gap))) // ормализовать?
            if(candidate < min){
                min = candidate;
                minIdx = ratesValuesByHours.indexOf(candidate)
            }*/

            for(let i = duration.startPoint; i <= duration.startPoint + (duration.gap - d.duration); i ++){
                if(ratesValuesByHours[normalizeHour(i)] < min){
                    min = ratesValuesByHours[normalizeHour(i)]
                    minIdx = normalizeHour(i)
                }
            }
        })
       
        return minIdx;
    }

    let ratesByHours = Array(24).fill()
    for (let r of input.rates) {
        let i = r.from;

        do {
            ratesByHours[(i % 24)] = r;
            i++;
            if ((i % 24) >= r.to) {
                break;
            }
        } while (true)
    }
    let ratesValuesByHours = ratesByHours.map((r) => r.value)

    let resPower = Array.apply(null, Array(24)).map(() => 0)
    let res = Array.apply(null, Array(24)).map(() => [])

    devices: for (let d of sortedDevices) {

        let from = 0;
        let to = 24;
        if (d.mode === "day") {
            from = day.from;
            to = day.to;
        }
        if (d.mode === "night") {
            from = day.to;
            to = day.from;
        }

        let index = 0;
        let placedDuration = 0;

        let sliceValuesByHours = eOfR(ratesValuesByHours, rangeToSetHours(from, to))

        //let min = Math.min(...sliceValuesByHours);
        let minIndex// = ratesValuesByHours.indexOf(min);

        let durationsCapacity = checkDurationCapacity(d, { from: from, to: to }, ratesValuesByHours, resPower)
        if (!durationsCapacity[0]) {
            throw new Error('No capacity found for this divice')
        } else {
            minIndex = getEconomicalDuration(durationsCapacity, d, ratesValuesByHours, resPower)
            
        }
        let sFrom = minIndex;
        let sTo = minIndex;
        

        if (resPower[minIndex] + d.power <= input.maxPower) {
            resPower[minIndex] += d.power;
            res[minIndex].push(d.id);
            output.consumedEnergy.devices[d.id] += (d.power * ratesValuesByHours[minIndex])
            placedDuration++;
        }

        while (placedDuration != d.duration) {
            let candidates = [];
            let candidatesValues = [];

            let candidate;
            candidate = normalizeHour(sFrom - 1);
            if (resPower[candidate] + d.power <= input.maxPower/* && checkInRangeHours(from, to, candidate)*/) {
                candidates[0] = candidate;
                candidatesValues[0] = ratesValuesByHours[candidate];
            }
            candidate = normalizeHour(sTo + 1);
            if (resPower[candidate] + d.power <= input.maxPower/* && checkInRangeHours(from, to, candidate)*/) {
                candidates[1] = candidate;
                candidatesValues[1] = ratesValuesByHours[candidate];
            }


            if (typeof(candidates[0]) !== undefined && typeof(candidates[1]) !== undefined) {
                if (candidatesValues[0] < candidatesValues[1]) {
                    sFrom = candidates[0];
                    resPower[sFrom] += d.power;
                    res[sFrom].push(d.id);
                    output.consumedEnergy.devices[d.id] += (d.power * ratesValuesByHours[sFrom]);
                    placedDuration++;
                } else {
                    sTo = candidates[1];
                    resPower[sTo] += d.power;
                    res[sTo].push(d.id);
                    output.consumedEnergy.devices[d.id] += (d.power * ratesValuesByHours[sTo])
                    placedDuration++;
                }
            } else
            if (candidates[0]) {
                sFrom = candidates[0];
                resPower[sFrom] += d.power;
                res[sFrom].push(d.id);
                output.consumedEnergy.devices[d.id] += (d.power * ratesValuesByHours[sFrom]);
                placedDuration++;
            } else {
                sTo = candidates[1];
                resPower[sTo] += d.power;
                res[sTo].push(d.id);
                output.consumedEnergy.devices[d.id] += (d.power * ratesValuesByHours[sTo]);
                placedDuration++;
            }
        }
    }

    res.map((el, idx) => {
        output.shedule[idx] = el;
    })

    for (var k in output.consumedEnergy.devices) {
        output.consumedEnergy.devices[k] = Number(output.consumedEnergy.devices[k].toFixed(4) / 1000)
        output.consumedEnergy.value += Number(output.consumedEnergy.devices[k])
    }
    output.consumedEnergy.value = Number(output.consumedEnergy.value.toFixed(4))
    printData(JSON.stringify(output, null, 2))
}