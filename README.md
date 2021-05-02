# Sorted Stream Graph Based On Dynamic Planning

## An easy example
```
    // create the svg and select it with d3
    const svg = d3.select('#your-svg');
    
    // prepare the data
    const data = [[1,2], [3,4]];
    
    // 
    const stream_graph = streamGraph(svg);
    
    // apply the dymanic based method to the algorithm, default with original method
    stream_graph.calculate(calculateLayoutByDynamic); 
    
    //
    stream_graph(data);
```

## How to run sample
1. run `git clone https://github.com/aerions/Algorithmic-Optimization-for-Sorted-Streamgraph-visualization.git`
2. modify the `sortedStreamGraph.js` to makesure the variable `runSample` is set to true
3. open the `index.html` with browser

## How to reuse the code
1. run `git clone https://github.com/aerions/Algorithmic-Optimization-for-Sorted-Streamgraph-visualization.git`
2. copy the sortedStreamGraph.js to your workspace
3. modify the `sortedStreamGraph.js` to makesure the variable `runSample` is set to false
4. enjoy it :)


## Run Experimental Code
1. run `git clone https://github.com/aerions/Algorithmic-Optimization-for-Sorted-Streamgraph-visualization.git`
2. modify the `sortedStreamGraph.js` to makesure the variable `runSample` is set to true
3. modify the `sortedStreamGraph.js` to makesure the variable `doComparision` is set to true
4. open the `index.html` with browser

| hint: the data is generated randomly and sometimes the difference is slightly, so you can run multiple times
