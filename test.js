const svgWidth = 1000;
const svgHeight = 600;

const svg = d3.select('svg');

svg.attr("width", svgWidth).attr("height", svgHeight);

// var x = d3.scaleLinear()
//   .domain([10, 130])
//   .range([0, 960]);

// console.log(d3.max(data, d => d.time.getTime()))


function streamGraph(svg) {

    let attr = {
        svgWidth: svg.attr('width'),
        svgHeight: svg.attr('height'),
        paddingVertical: 1,
        paddingHorizontal: 1,
        svgBackgroundColor: 'black',
        margin: 100,
        color: d3.scaleOrdinal(d3.schemeCategory10),
        scaleColor: (_, ind) => attr.color(ind),
        opacity: '0.5',
    };

    function calculate_layout(layers) {
        function less(a, b, time) {
            for (let i = time; i >= 0; i--) {
                if (layers[a][i] !== layers[b][i])
                    return layers[a][i] < layers[b][i];
            }
            if (options.name && options.name[a] !== options.name[b])
                return options.name[a] < options.name[b];
            return false;
        }

        let length = 0;

        // validate the data format
        layers.map(data => {
            if (!length)
                length = data.length;
            else if (length !== data.length)
                throw new Error("The length of data is not equal");
        });

        let minV = new Array(length).fill(undefined),
            maxV = new Array(length).fill(undefined),
            timeBlocks = new Array(length).fill(undefined).map(_ => []),
            stackSum = new Array(length).fill(undefined).map(_ => []),
            stackNoneZeroCount = new Array(length).fill(undefined).map(_ => []),
            result = new Array(layers.length).fill(undefined).map(_ => []);


        // update the related information and rearrange the structure by timestamp (The data is arrange by stream initially)

        layers.map((data, ind1) => {
            data.map((d, ind2) => {
                if (ind1 === 0) {
                    minV[ind2] = maxV[ind2] = d;
                }
                minV[ind2] = Math.min(minV[ind2], d);
                maxV[ind2] = Math.max(maxV[ind2], d);
                // add the data to corresponding array(ind2 represents the timestamp)
                // store the value and original index for stream(ind1 represents the original index)
                timeBlocks[ind2].push([d, ind1]);
            });
        })

        // then sort the data
        timeBlocks.map((arr, ind1) => {
            // sort the data by value in ascending
            arr.sort((a, b) => (a[0] === b[0] ? 0 : (a[0] < b[0] ? -1 : 1)));

            // calculate the prefix-sum
            arr.forEach((d, ind2) => {

                stackSum[ind1].push(ind2 === 0 ? d[0] : d[0] + stackSum[ind1][ind2 - 1]);
                // count the block with size bigger than zero
                stackNoneZeroCount[ind1].push(ind2 === 0 ? 0 : stackNoneZeroCount[ind1][ind2 - 1] + (stackSum[ind1][ind2 - 1] > 0));

            });
        });

        timeBlocks.forEach((arr, ind1) => {
            arr.forEach((d, ind2) => {

                let index = d[1], value = d[0], y0, y = value;
                if (ind2 === 0) {
                    y0 = 0;
                } else {
                    if (value > 0)
                        y0 = stackSum[ind1][ind2] - value + (stackNoneZeroCount[ind1][ind2] + 1) * attr.paddingVertical;
                    else
                        y0 = 0;
                }

                if (result[index].length === 0 && layers[index][ind1] === 0)
                    return true;

                result[index].push({x: ind1 * attr.paddingHorizontal * 7 + 1, y0, y});
                result[index].push({x: ind1 * attr.paddingHorizontal * 7 + 4, y0, y});
            })
        });
        console.log(JSON.stringify(result))
        return result;
    }

    let process = d => d;

    let calculate = calculate_layout;


    let stream_graph = function (source_data, options) {


        svg.attr('fill', attr.svgBackgroundColor);

        const processed_layer = process(source_data);


        const data = calculate(processed_layer);

        attr.color.domain(d3.range(data.length))

        // console.log(attr.scaleColor(1, 1), attr.scaleColor(1, 2))
        console.log('this the position calculated', data);

        const x = d3.scaleLinear()
            .domain([d3.min(data, (onelayer) => d3.min(onelayer, d => d.x))
                , d3.max(data, (onelayer) => {
                    return d3.max(onelayer, d => d.x);
                })])
            .range([attr.margin, attr.svgWidth - attr.margin]);


        const y = d3.scaleLinear()
            .domain([0, d3.max(data, (onelayer) => {
                return d3.max(onelayer, d => d.y0 + d.y);
            })])
            .range([attr.svgHeight - attr.margin, attr.margin]);

        const timestampCnt = processed_layer[0].length;
        if (calculate === calculate_layout) {
            const timestampBlock = svg.append('g');
            new Array(timestampCnt).fill(undefined).map((_, i) => {
                const mnX = x(attr.paddingHorizontal * i * 7 + 1),
                    mxX = x(attr.paddingHorizontal * i * 7 + 4),
                    // mnY = attr.margin - 20,
                    mnY = 0,
                    // mxY = attr.svgHeight - attr.margin + 20;
                    mxY = attr.svgHeight;
                timestampBlock.append('rect')
                    .attr('x', mnX)
                    .attr('width', mxX - mnX)
                    .attr('y', mnY)
                    .attr('height', mxY - mnY)
                    .attr('fill', 'rgb(209, 213, 238)')
            });
        }

        const area = d3.area()
            .x(d => x(d.x))
            .y0(function (d) {
                return y(d.y0);
            })
            .y1(function (d) {
                return y(d.y0 + d.y);
            })
            .curve(d3.curveMonotoneX);

        svg.append('g').selectAll('path')
            .data(data)
            .enter()
            .append('path')
            .attr('d', d => {
                // console.log(d);
                return area(d);
            })
            .style('fill', attr.scaleColor)
            .style('stroke', attr.scaleColor)
            .style('stroke-width', attr.strokeWidth)
            .style('opacity', attr.opacity)

        const x_range = x.range();
        // console.log('this is x range', x_range)

        // Add decoration
        if (options) {
            if (options.title) {
                const text = svg.append('g').append('text');
                text
                    .style('text-anchor', 'middle')
                    .style('font-size', 25)
                    .attr('x', attr.svgWidth / 2)
                    .attr('y', attr.margin / 2)
                    .text(options.title)
            }

            if (options.subtitle) {
                const text = svg.append('g').append('text');
                text
                    .style('text-anchor', 'middle')
                    .style('font-size', 15)
                    .attr('x', attr.svgWidth / 2)
                    .attr('y', attr.margin / 2 + 25 / 3 * 2)
                    .text(options.subtitle)
            }

            if (options.name) {
                const streamName = svg.append('g');
                for (let i = 0; i < data.length; i++) {
                    streamName.append('text')
                        .style('text-anchor', 'end')
                        .style('text-font', 20)
                        .style('font-weight', 'bold')
                        .style('font-family', 'Consolas,"Courier New",Courier,FreeMono,monospace')
                        .text(options.name[i])
                        .attr('x', x(data[i][0].x) - 5)
                        .attr('y', y(data[i][0].y / 2 + data[i][0].y0))
                }
            }
        }
    }

    const error = (err) => {
        throw err;
    }

    stream_graph.attr = (name, value) => {
        return value === undefined ? attr[name] : (attr[name] = value, stream_graph)
    }

    stream_graph.process = (_) => {
        console.log('im in process');
        return arguments.length ? (process = typeof _ === "function" ? _ : error(new TypeError('The argument of process must be function'))) : process
    }

    stream_graph.calculate = (_) => {
        return arguments.length ? (calculate = typeof _ === "function" ? _ : error(new TypeError('The argument of calcualte must be function'))) : calculate;
    }

    return stream_graph;
}

let stream_graph = streamGraph(svg);

const options = {
    title: 'Stream Graph Demo'.toUpperCase(),
    subtitle: 'This is subtitle. Show more information about the stream graph',
    name: ['Stream1', 'Stream2', 'Stream3', 'Stream4', 'Stream5', 'Stream6'],
}

const dataCount = 10;
const data = new Array(dataCount).fill(0).map(() => new Array(2).fill(0).map(() => {
    return Math.floor(Math.random() * 30);
}));
console.log('this is data');
console.log(data);

stream_graph.calculate(calculateLayoutByDynamic);
// stream_graph([[4, 1,3, 2],[3,2,2,4], [2,3,5,2], [1,1,7,3], [0, 3, 5, 2], [0, 1, 3, 3], [0, 1, 0, 5]], options)
// stream_graph([[16, 3], [3, 1], [0, 22], [4, 7], [8, 8], [0, 2], [0, 2]])

stream_graph(data);

// TODO add a new function for calculating the layers position

function calculateLayoutByDynamic(layers) {

    console.log('original layers');
    console.log(layers);

    /*
    ** check if the layers is illeagal
    */
    if (!layers.length) {
        throw new Error('The input layers must be formatted code style.');
    }

    let length = 0;

    // validate the data format
    layers.map(data => {
        if (!length)
            length = data.length;
        else if (length !== data.length)
            throw new Error("The length of data is not equal");
    });

    const numLayer = layers.length;
    const lenLayer = layers[0].length;


    //less function for compare two layer in certain timestamp
    function less(a, b, time) {
        for (let i = time; i >= 0; i--) {
            if (layers[a][i] !== layers[b][i])
                return layers[a][i] < layers[b][i] ? -1 : 1;
        }
        return 0;
    }

    // generate less function for specefic timestamp
    function lessAtX(x) {
        return function (a, b) {
            return less(a, b, x);
        }
    }

    //input process the height array
    const indexes = new Array(layers[0].length).fill(0).map(() => {
        const ret = [];
        for (let i = 0; i < layers.length; i++) {
            ret.push(i);
        }
        return ret;
    });

    console.log('this is original indexes');
    console.log(indexes);

    indexes.forEach((d, i) => {
        const nLess = lessAtX(i);
        d.sort(nLess);
    })

    console.log('this is sorted indexes');
    console.log(indexes);

    //height prefix sum

    // calculate height first
    const heights = indexes.map((datas, i) => {
        return datas.map(d => layers[d][i]);
    })

    console.log('this is heights', heights);

    const sHeight = new Array(lenLayer).fill(0).map(
        () => new Array(numLayer).fill(0)
    );
    console.log('this is prefix height');
    console.log(sHeight);

    // == calculate prefix sum
    for (let i = 0; i < lenLayer; i++) {
        const height = heights[i];
        sHeight[i][0] = height[0];
        for (let j = 1; j < numLayer; j++) {
            sHeight[i][j] = sHeight[i][j - 1] + height[j];
        }
    }


    console.log('this is mapped height');
    console.log(heights);

    console.log('this is prefix height');
    console.log(sHeight);

    // rank for each layers in every timestamp
    // Shape: Layer * Column
    const ranks = new Array(layers.length).fill(0).map(
        () => new Array(layers[0].length).fill(0)
    );

    indexes.forEach((arr, i) => {
        arr.forEach((d, j) => {
            ranks[d][i] = j;
        })
    });

    console.log('this is rank for each layer');
    console.log(ranks);

    PADDING = 1;
    // calculate middle sum function
    // Input the timestamp number, start position, end position
    // Return sum of the layers between start and end layer in certain timestamp
    function calculateMiddleSum(t, s, e) {
        // t: timestamp
        // s: start
        // e: end
        const paddings = Math.abs(e - s) * PADDING;
        if (e <= -1)
            return sHeight[t][s] + paddings;
        return sHeight[t][s] - sHeight[t][e] + paddings;
    }

    // TODO complete the dp part

    if (lenLayer > 2) {
        throw new Error('the length must less than or equal to 2');
    }


    // maxHeight = the maximal sum of height + PADDING * layers' length
    const maxHeight = d3.max(heights, d => d3.sum(d)) + (heights[0].length) *PADDING;
    // const maxHeight = 100;

    console.log('this is max height', maxHeight);

    const f = new Array(maxHeight + 1).fill(0).map(
        () => new Array(maxHeight + 1).fill(0).map(
            () => new Array(numLayer + 1).fill(0).map(
                () => new Array(numLayer + 1).fill(Infinity)
            )
        )
    );
    const mark = new Array(maxHeight + 1).fill(0).map(
        () => new Array(maxHeight + 1).fill(0).map(
            () => new Array(numLayer + 1).fill(0).map(
                () => new Array(numLayer + 1).fill(false)
            )
        )
    );

    const from = new Array(maxHeight + 1).fill(0).map(
        () => new Array(maxHeight + 1).fill(0).map(
            () => new Array(numLayer + 1).fill(0).map(
                () => new Array(numLayer + 1).fill(null)
            )
        )
    );

    console.log('this is f, mark, and from', f, mark, from);

    function dp(H1, H2, lx, ly) {
        const x = lx - 1;
        const y = ly - 1;
        if (calculateMiddleSum(0, x, -1) > H1 || calculateMiddleSum(1, y, -1) > H2)
            return Infinity;

        // if it's the last element
        if (x <= 0 && y <= 0)
            return 0;


        // console.log('current at', H1, H2, x, y);
        // if the condition has been calculated
        if (mark[H1][H2][lx][ly])
            return f[H1][H2][lx][ly];

        // mark this condition
        mark[H1][H2][lx][ly] = true;

        const ind1 = indexes[0][x];
        const ind2 = indexes[1][y];
        const ind1InRight = ranks[ind1] ? ranks[ind1][1] : undefined;
        const ind2InLeft = ranks[ind2] ? ranks[ind2][0] : undefined;
        const xHeight = heights[0][x];
        const yHeight = heights[1][y];

        if (x >= 0) {
            // emurate hight in left
            let maxH, minH, condition;
            if (ind1InRight > y) {
                minH = H2 + calculateMiddleSum(1, ind1InRight - 1, y - 1) - PADDING;
                condition = 0; // higher than y we know the lowerbound
            } else if (ind1InRight < y) {
                maxH = H2 - calculateMiddleSum(1, y, ind1InRight);
                condition = 1;//lower than y
            } else {
                condition = 2; // equal to y
            }
            for (let i = 0; i + xHeight + PADDING <= H1; i++) {
                let err = 0;
                if (condition === 0 && x > ind1InRight && H1 - i / 2 < minH + heights[1][ind1InRight] / 2) {
                    err = 1
                }
                if (condition === 1 && x < ind1InRight && H1 - i / 2 > maxH - heights[1][ind1InRight] / 2) {
                    err = 1
                }

                if (condition != 2 && x === ind1InRight) {
                    if (condition === 0 && H1 - i != minH + xHeight)
                        err = 1;

                    if (condition === 1 && H1 - i != maxH)
                        err = 1;
                }
                const nextH = H1 - i - xHeight - PADDING;
                const res = err + dp(nextH, H2, x, ly);
                if (f[H1][H2][lx][ly] > res) {
                    f[H1][H2][lx][ly] = res;
                    from[H1][H2][lx][ly] = [nextH, H2, x, ly];
                }
            }
        }

        if (y >= 0) {
            // emurate hight in right
            let maxH, minH, condition;
            if (ind2InLeft > x) {
                minH = H1 + calculateMiddleSum(0, ind2InLeft - 1, x - 1) - PADDING;
                condition = 0;
            } else if (ind2InLeft < x) {
                maxH = H1 - calculateMiddleSum(0, x, ind2InLeft);
            } else {
                condition = 2;
            }
            for (let i = 0; i + yHeight + PADDING <= H2; i++) {
                let err = 0;
                if (condition === 0 && y > ind2InLeft && H2 - i / 2 < minH + heights[0][ind2InLeft] / 2) {
                    err = 1;
                }
                if (condition === 1 && y < ind2InLeft && H2 - i / 2 > maxH - heights[0][ind2InLeft] / 2) {
                    err = 1
                }
                if (condition !== 2 && y === ind2InLeft) {
                    if (condition === 0 && H2 - i < minH + yHeight)
                        err = 1;
                    if (condition === 1 && H2 - i > maxH)
                        err = 1;
                }
                const nextH = H2 - i - yHeight - PADDING;
                const res = err + dp(H1, nextH, lx, y);
                if (f[H1][H2][lx][ly] > res) {
                    f[H1][H2][lx][ly] = res;
                    from[H1][H2][lx][ly] = [H1, nextH, lx, y];
                }
            }

        }
        // there's no need to emurate right and left same time, because the condition will be hitten by emurate left column and emurate the right then
        return f[H1][H2][lx][ly];
    }

    const positions = new Array(numLayer).fill(0).map(
        () => new Array(lenLayer).fill(0)
    );


    const finalError = dp(maxHeight, maxHeight, numLayer, numLayer);
    d3.select('#error').html('Error: ' + finalError)
    console.log(dp(maxHeight, maxHeight, numLayer, numLayer));
    console.log(f, mark, from);

    for (let h1 = maxHeight, h2 = maxHeight, x = numLayer, y = numLayer; ;) {
        // console.log(h1, h2, x, y);
        // console.log(from[h1]);
        // console.log(from[h1][h2]);
        // console.log(from[h1][h2][x]);
        const [nh1, nh2, nx, ny] = from[h1][h2][x][y];
        if (x != nx) {
            positions[indexes[0][nx]][0] = nh1;
        } else {
            positions[indexes[1][ny]][1] = nh2;
        }
        h1 = nh1;
        h2 = nh2;
        x = nx;
        y = ny;
        if (!from[h1][h2][x][y])
            break;
    }

    const timeBlocks = new Array(numLayer).fill(0).map(
        () => new Array(lenLayer * 2).fill(0)
    );

    positions.forEach((posArr, i) => {
        posArr.forEach((UpperHeight, j) => {
            timeBlocks[i][j * 2] = {
                x: j * 7 + 1,
                y0: UpperHeight + PADDING,
                y: layers[i][j],
            };
            timeBlocks[i][j * 2 + 1] = {
                x: j * 7 + 4,
                y0: UpperHeight + PADDING,
                y: layers[i][j],
            }
        })
    })
    console.log(positions);
    return timeBlocks;
}