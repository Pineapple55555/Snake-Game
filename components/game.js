import { Camera } from '/components/camera.js';
import { Grid } from '/components/grid.js';
import { Head } from '/components/head.js';
import { Tail } from '/components/tail.js';
import { Binary } from '/components/binaryBits.js';
import { Ui } from '/components/ui.js';



export class Game {
    active = false
    

    constructor() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer();
        this.gridSize = 17;
        this.squareSize = 1;
        this.gridStep = 1;
        this.lastUpdateTime = 0;
        this.currentPoints = 0
        
        // Set up camera and grid
        this.camera = new Camera(window.innerWidth, window.innerHeight);
        this.grid = new Grid(this.gridSize, this.squareSize);
        this.ui = new Ui()
        this.ui.updateTargetNumber();
        this.ui.updatePoints(this.currentPoints);
        this.tailSegments = [];
        this.positionQueue = [];
        this.snakeList = [];
        this.currentBinary = null
    
        // Generate binary grid
        const stockData = { price_usd: 0.002312, market_cap: 1234567 };
        this.binary = new Binary();
        this.binaryGroup = null;
        this.binary.generateBinary(stockData, this.gridSize, 8).then((group) => {
            this.binaryGroup = group;
            this.scene.add(this.binaryGroup);
        });
    
        // Add objects to scene
        this.scene.add(this.grid.getGroup());
    
        this.head = new Head(this);  
        this.scene.add(this.head.getBall());
    
        // Set up renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // window listener
        /*
        window.addEventListener('keydown', (event) => {
            if (event.key === 'F12') {
                setTimeout(() => {
                    resizeScene();
                }, 100); // Slight delay to allow DevTools to open
            }
        });
        window.addEventListener('resize', resizeScene);
        */
    
        // Keyboard listener
        document.addEventListener("keydown", (event) => this.handleInput(event));

        // Listen for collision events
        this.head.addEventListener("homeCollision", (event) => {
            //gets snake list, this.snakeList, and runs a check
            this.checkBinary(this.snakeList)
            this.snakeList = []

        });

    }

    /*
    resizeScene() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Update camera aspect ratio and projection matrix
        this.camera.getCamera().aspect = width / height;
        this.camera.getCamera().updateProjectionMatrix();

        // Update renderer size
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
    } */
    
checkBinary(userBinary) {
    console.log("user", userBinary);
    console.log("comparison", this.ui.currentBinary.split(''));

    // ✅ Convert userBinary to a string and pad with leading 0s if needed
    let paddedUserBinary = userBinary.map(String).join('').padStart(8, '0');

    // ✅ Ensure the comparison binary is also 8 characters
    let targetBinary = this.ui.currentBinary.padStart(8, '0').split('');

    console.log("Padded user binary:", paddedUserBinary);
    console.log("Target binary:", targetBinary);

    // ✅ Compare the padded binary with the stored binary
    if (paddedUserBinary.length === targetBinary.length &&
        paddedUserBinary.split('').every((bit, index) => bit === targetBinary[index])) {
        console.log("✅ Binary match!");
    } else {
        console.log("❌ Binary mismatch.");
    }

    this.ui.updateSegments(this.snakeList);
}


    pointsManager() {
        //generate a number from randomly choosing a number in a json file
        getRandomLineFromJson('path/to/your/file.json').then(result => {
            if (result) {
                console.log('Random Line:', result.line);
                console.log('Index:', result.index);
            }
        });
        //display that number on the screen, where the user will work out which number it is
        //when user is home, check binary 

    }

    animate(time) {
    
        requestAnimationFrame((t) => this.animate(t));
    
        if (time - this.lastUpdateTime > 200) {
            const headPosition = this.head.getBall().position.clone();
            this.head.move(this.gridSize, this.gridStep);
            this.positionQueue.push(headPosition);
    
            while (this.positionQueue.length > this.tailSegments.length) {
                this.positionQueue.shift();
            }
            this.tailSegments.forEach((segment, index) => {
                if (this.positionQueue[index]) {
                    segment.update(this.positionQueue[index]);
                }
            });
            this.pickupChecker();
            this.lastUpdateTime = time;
        }
        this.renderer.render(this.scene, this.camera.getCamera());
    }
    

    addTailSegment(type) {
        let texturePath, baseColor;
    
        if (type === 0) {
            texturePath = "/assets/0.png";
            baseColor = 0x000000;
        } else if (type === 1) {
            texturePath = "/assets/1.png";
            baseColor = 0xffffff;
        } else {
            texturePath = "/assets/blank.png";
            baseColor = 0x808080;
        }

        this.ui.updateSegments(this.snakeList);
    
        const newTailSegment = new Tail(texturePath, baseColor);
        const referenceBall = this.tailSegments.length > 0 
            ? this.tailSegments[this.tailSegments.length - 1].getBall()
            : this.head.getBall();
    
        newTailSegment.getBall().position.copy(referenceBall.position.clone());
        this.tailSegments.push(newTailSegment);
        this.scene.add(newTailSegment.getBall());
    
        this.head.tailSize++;
    }
    

    removeLastSegment() {
        if (this.tailSegments.length > 0) {
            const segmentToRemove = this.tailSegments.shift(); // Removes the first segment
            this.scene.remove(segmentToRemove.getBall());

            // Remove the first element in the position queue, if it exists
            if (this.positionQueue.length > 0) {
                this.positionQueue.shift();
            }
        }
    }

    clearTail() {
        while (this.tailSegments.length > 0) {
            this.removeLastSegment();
            this.ui.updateSegments(this.snakeList);
        }
    }

    pickupChecker() {
        if (!this.binaryGroup) {
            console.warn("binaryGroup is not initialized yet.");
            return; // Exit early if binaryGroup is undefined
        }

        const headPosition = this.head.getBall().position; // Get the head's position

        // Loop through all cubes in the group
        this.binaryGroup.children.forEach((cube) => {
            const cubePosition = cube.position;

            // Check if the head's position matches the cube's position
            if (headPosition.x === cubePosition.x && headPosition.z === cubePosition.z) {
            
                // Play munch sound
                const munchSound = new Audio('/assets/munch.mp3');
                munchSound.play();
            
                this.snakeList.push(cube.value);
                this.addTailSegment(cube.value);
                this.end();
            

                // Remove the cube from the group and scene
                this.binaryGroup.remove(cube);
                this.scene.remove(cube);
            }
        });
    }

    handleInput(event) {
        const key = event.key.toLowerCase();
    
        // If the snake is at (0,0), allow movement again
        if (this.head.onHomeSquare) {
            console.log("🏡 Leaving home, movement allowed again!");
            this.head.ye = false;
        }
    
        // Prevent reversing direction
        if ((key === 'arrowup' || key === 'w') && this.head.direction.y === 1) return;
        if ((key === 'arrowdown' || key === 's') && this.head.direction.y === -1) return;
        if ((key === 'arrowleft' || key === 'a') && this.head.direction.x === 1) return;
        if ((key === 'arrowright' || key === 'd') && this.head.direction.x === -1) return;
    
        // Movement logic
        if (key === 'arrowup' || key === 'w') {
            this.head.setDirection(0, -1);
        } else if (key === 'arrowdown' || key === 's') {
            this.head.setDirection(0, 1);
        } else if (key === 'arrowleft' || key === 'a') {
            this.head.setDirection(-1, 0);
        } else if (key === 'arrowright' || key === 'd') {
            this.head.setDirection(1, 0);
        }
        
    }
    
    start() {
        
        console.log("Starting game...");
        this.animate(0);
        this.active = true
    }
    
    end(){
        this.active = false
        console.log("game end")
    }
}
