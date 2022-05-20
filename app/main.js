(function () {
    'use strict';

    // Colors
    const COLOR_PATH = '#CCC';
    const COLOR_START = '#51AAF5';
    const COLOR_END = '#A5F74D';
    const COLOR_RESOLVED_PATH = 'crimson';

    // Directions
    const DIR_TOP    = 0;
    const DIR_LEFT   = 1;
    const DIR_RIGHT  = 2;
    const DIR_BOTTOM = 3;

    // Convert a direction to its opposite
    const DIR_TO_OPPOSITE_DIR_LOOKUP = [
        /* DIR_TOP    --> */ DIR_BOTTOM,
        /* DIR_LEFT   --> */ DIR_RIGHT,
        /* DIR_RIGHT  --> */ DIR_LEFT,
        /* DIR_BOTTOM --> */ DIR_TOP,
    ];

    // Convert a direction to an unit vector
    const DIR_TO_RELATIVE_COORD_LOOKUP = [
        /* DIR_TOP    --> */ [ 0, -1],
        /* DIR_LEFT   --> */ [-1,  0],
        /* DIR_RIGHT  --> */ [+1,  0],
        /* DIR_BOTTOM --> */ [ 0, +1],
    ];

    class Node {

        constructor(x, y) {
            
            this.x = x;
            this.y = y;
            this.nighs = [null, null, null, null];
            this.metBy = null;
            this.isVisited = false;
        }

        // Link to nodes together
        addEdge(dir, target) {
            
            const oppositeDir = DIR_TO_OPPOSITE_DIR_LOOKUP[dir];

            this.nighs[dir] = target;
            target.nighs[oppositeDir] = this;
        }

        // Check if the target node is linked to this node
        isLinkedTo(target) {

            for (let nigh of this.nighs) {

                if (nigh === target) {
                    return true;
                }
            }

            return false;
        }

        // Do a breath-first search starting from the current node
        // and ending to the given node, the state of the affected nodes
        // will be updated
        breadthFirstSearch(endingNode) {

            const queue = [];

            queue.push(this);

            while (queue.length > 0) {

                const node = queue.shift();
                node.isVisited = true;

                if (node === endingNode) return queue;

                for (let nigh of node.nighs) {

                    if (!nigh) continue;
                    if (nigh.metBy || nigh.isVisited) continue;

                    nigh.metBy = node;
                    queue.push(nigh);
                }
            }

            return null;
        }

        // Reset the state previously modified by the breathFirstSearch() method
        resetState() {
            this.metBy = null;
            this.isVisited = false;
        }
    }

    // Global variables

    let maze = [];
    let shortestPath = [];
    let radius = 0;
    let innerRadius = 0;
    let diameter = 0;
    let nodeSize = 20;
    let nbExtraPaths = 0;
    let startingNode = null;
    let endingNode = null;
    let currentProgress = 0;
    let isAsyncMode = false;
    let animFrameId = 0;
    let promiseReject = null;

    // HTML elements

    const mazeWrapper = document.getElementById('maze-wrapper');

    const canvas = document.getElementById('maze');
    const ctx = canvas.getContext('2d');

    // HTML inputs

    const inputRadius = document.getElementById('input-radius');
    const inputInnerRadius = document.getElementById('input-inner-radius');
    const inputPathsDensity = document.getElementById('input-paths-density');
    const inputPreviewType = document.getElementById('input-preview-type');

    // Events

    window.addEventListener('resize', resize);

    inputRadius.addEventListener('input', generateMaze);
    inputInnerRadius.addEventListener('input', generateMaze);
    inputPathsDensity.addEventListener('input', generateMaze);
    inputPreviewType.addEventListener('input', generateMaze);

    // Functions

    generateMaze();
    // Generate the full maze
    async function generateMaze() {

        cancelAnimationFrame(animFrameId);
        animFrameId = 0;
        if (promiseReject) promiseReject();
        promiseReject = null;

        startingNode = null;
        endingNode = null;

        radius = +inputRadius.value;
        innerRadius = radius * (inputInnerRadius.value / 100) | 0;
        const areaOuter = Math.PI * radius**2;
        const areaInner = Math.PI * innerRadius**2;
        const density = inputPathsDensity.value / 100 ;
        nbExtraPaths = (areaOuter - areaInner) * density;
        isAsyncMode = (inputPreviewType.value === 'show-progress');

        diameter = 2 * radius + 1;

        maze = new Array(diameter ** 2).fill(null);

        shortestPath = [];

        const startingX = 0;
        const startingY = diameter / 2 | 0;

        const endingX = diameter - 1;
        const endingY = diameter / 2 | 0;

        const fromX = diameter / 2 | 0;
        const fromY = 0;

        const history = [];

        history.push(createNodeInMaze(fromX, fromY));

        resize();

        while (true) {

            if (history.length === 0) {
                break;
            }

            const node = history[history.length - 1];
            const x = node.x;
            const y = node.y;

            const freeSpacesCoord = [];

            for (let dir = 0; dir < 4; dir++) {

                const [relX, relY] = DIR_TO_RELATIVE_COORD_LOOKUP[dir];
                const targetX = x + relX;
                const targetY = y + relY;

                if (checkSpaceFree(targetX, targetY)) {
                    freeSpacesCoord.push([dir, targetX, targetY]);
                }
            }

            if (freeSpacesCoord.length === 0) {

                history.pop();
                continue;
            }

            const [dir, newX, newY] = getRandomValue(freeSpacesCoord);
            const newNode = createNodeInMaze(newX, newY);

            node.addEdge(dir, newNode);
            history.push(newNode);

            redrawIfNeeded();

            await waitNextFrame();
        }

        await addRandomExtraPaths(nbExtraPaths);

        startingNode = getNodeAt(startingX, startingY);
        endingNode = getNodeAt(endingX, endingY);

        redrawIfNeeded();
        
        resolveMaze();
    }


    // Resolve the maze
    function resolveMaze() {

        startingNode.breadthFirstSearch(endingNode);

        let prevNode = endingNode;

        shortestPath = [endingNode];

        while (prevNode) {
            shortestPath.push(prevNode);
            prevNode = prevNode.metBy;
        }

        shortestPath.reverse();

        for (let node of maze) {
            if (node) node.resetState();
        }

        updateVisualProgress();
    }


    // Update the visual progress corresponding to the shortest path to take
    async function updateVisualProgress() {

        const totalProgress = shortestPath.length - 1;

        const start = Date.now();
        let duration = start;

        do {

            if (!isAsyncMode) {
                currentProgress = totalProgress;
                break;
            }

            duration = Date.now() - start;

            currentProgress = duration / 100;
            redrawIfNeeded();

            await waitNextFrame();

        } while (currentProgress < totalProgress);

        redraw();
    }


    // Resize the canvas and redraw its content
    function resize() {

        const nbTiles = 2 * diameter + 1;
        const rect = mazeWrapper.getBoundingClientRect();

        let canvasWidth = (rect.width < rect.height ? rect.width : rect.height);

        nodeSize = canvasWidth / nbTiles | 0;

        canvasWidth = nodeSize * nbTiles;
        
        canvas.width  = nodeSize * nbTiles;
        canvas.height = nodeSize * nbTiles;

        redraw();
    }


    // Redraw the canvas if the async mode is set to true
    function redrawIfNeeded() {
        if (isAsyncMode) {
            redraw();
        }
    }


    // Redraw the whole canvas
    function redraw() {

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw labyrinth path
        // -  Path
        for (let y = 0; y < diameter; y++) {
            for (let x = 0; x < diameter; x++) {
                
                const node = getNodeAt(x, y);

                if (!node) continue;

                if (node === startingNode || node === endingNode) {
                    // for drawing start and end after the path (better visual)
                    continue;
                }

                drawNode(node)
            }
        }

        // - Start and end
        if (startingNode)  drawNode(startingNode);
        if (endingNode)    drawNode(endingNode);

        // Draw the path resolution
        drawPath();
    }

    // Draw a node (with his path to the next node) at the correct coordinates in the canvas
    function drawNode(node)
    {
        const [pxX, pxY] = nodeCoordToPxCoordTopLeft(node.x, node.y);

        let marginX = 0;
        let marginY = 0;

        if (node === startingNode || node === endingNode) {
            marginX = nodeSize / 2 | 0;
            marginY = nodeSize / 2 | 0;
        }

        ctx.fillStyle = COLOR_PATH;

        for (let dir = 0; dir < 2; dir++) {

            if (!node.nighs[dir]) {
                continue;
            }

            const [relX, relY] = DIR_TO_RELATIVE_COORD_LOOKUP[dir];

            const targetPxX = pxX + relX * nodeSize;
            const targetPxY = pxY + relY * nodeSize;
            
            ctx.fillRect(targetPxX, targetPxY, nodeSize, nodeSize);
        }

        if (node === startingNode) {
            ctx.fillStyle = COLOR_START;
        } else if (node === endingNode) {
            ctx.fillStyle = COLOR_END;
        }

        ctx.fillRect(pxX - marginX, pxY - marginY, nodeSize + 2*marginX, nodeSize + 2*marginY);
    }

    // Draw the shortest path in the maze
    function drawPath()
    {
        ctx.strokeStyle = COLOR_RESOLVED_PATH;
        ctx.lineWidth = nodeSize;

        let i = 0;

        if (shortestPath.length === 0) return;

        const firstNode = shortestPath[0];

        let [prevPxX, prevPxY] = nodeCoordToPxCoordCenter(firstNode.x, firstNode.y);

        ctx.beginPath();

        for (let node of shortestPath) {

            if (i >= currentProgress + 1) break;

            let [pxX, pxY] = nodeCoordToPxCoordCenter(node.x, node.y);
            
            if (node === startingNode) {
                ctx.moveTo(pxX, pxY);
            }
            else if (currentProgress >= i) {
                ctx.lineTo(pxX, pxY);
            }
            else {
                const weight = i - currentProgress;
                const [deltaPxX, deltaPxY] = interpolatePoints(pxX, pxY, prevPxX, prevPxY, weight);
                ctx.lineTo(deltaPxX, deltaPxY);
            }

            prevPxX = pxX;
            prevPxY = pxY;

            i++;
        }

        ctx.stroke();
    }


    // Add the specified number of extra paths (extra connections) to the maze
    async function addRandomExtraPaths(nbExtraPaths) {

        const allNodes = maze.filter(node => node !== null);

        while (nbExtraPaths > 0) {

            const node = getRandomValue(allNodes);

            for (let dir = 0; dir < 4; dir++) {

                const [relX, relY] = DIR_TO_RELATIVE_COORD_LOOKUP[dir];

                const targetX = node.x + relX;
                const targetY = node.y + relY;

                const target = getNodeAt(targetX, targetY);

                if (target && !node.isLinkedTo(target)) {
                    node.addEdge(dir, target);
                    nbExtraPaths--;
                    redrawIfNeeded();
                    await waitNextFrame();
                }
            }
        }
    }


    // Check if the space at the specified coordinate
    // can be used to create a new node on it
    function checkSpaceFree(x, y) {

        const x0 = x - radius;
        const y0 = y - radius;

        if (x < 0 || x >= diameter || y < 0 || y >= diameter) return false;

        if (Math.sqrt(x0**2 + y0**2) > radius + 1/3) return false;

        if (Math.sqrt(x0**2 + y0**2) < innerRadius - 2/3) return false;
        
        const node = getNodeAt(x, y);

        return node === null;
    }


    // Convert a coordinate to an index for the maze variable
    function coordToIndex(x, y) {
        return y * diameter + x;
    }


    // Get a node from the maze at the specified coordinate,
    // or null if none is presents here
    function getNodeAt(x, y) {
        
        if (x < 0 || x >= diameter) return null;
        if (y < 0 || y >= diameter) return null;

        return maze[coordToIndex(x, y)];
    }


    // Create a new node in the specified coordinate in the maze
    function createNodeInMaze(x, y) {

        const node = new Node(x, y);
        maze[coordToIndex(x, y)] = node;

        return node;
    }


    // Convert the coordinate of a node to
    // the pixel coordinate (top left corner of the node)
    function nodeCoordToPxCoordTopLeft(x, y) {
        return [
            nodeSize * (2*x + 1),
            nodeSize * (2*y + 1),
        ];
    }


    // Convert the coordinate of a node to
    // the pixel coordinate (center of the node)
    function nodeCoordToPxCoordCenter(x, y) {
        return [
            nodeSize * (2*x + 1) + nodeSize / 2,
            nodeSize * (2*y + 1) + nodeSize / 2,
        ];
    }


    // Do a linear interpolation between two points
    // with the specified weight
    function interpolatePoints(x1, y1, x2, y2, weight) {
        return [
            x1 + weight * (x2 - x1),
            y1 + weight * (y2 - y1),
        ]
    }


    // Get a random value from the given array
    function getRandomValue(array) {
        return array[Math.random() * array.length | 0];
    }


    // Return a promise which is resolved the next frame (async mode only)
    async function waitNextFrame() {
        
        if (isAsyncMode) {
            return new Promise((resolve, reject) => {
                promiseReject = reject;
                animFrameId = requestAnimationFrame(resolve);
            });
        }

        return Promise.resolve();
    }
})();
