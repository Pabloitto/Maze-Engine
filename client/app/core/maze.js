module.exports = (function(){

	var Cell = require("./cell");
	var ImageFactory = require("./images");
	var end = null;
	var defaultDirection = {
			direction : 'bottom',
			index : 0,
			positions : [
				{x : 0 ,y : 0},
		    	{x : 1 ,y : 0},
		    	{x : 2 ,y : 0}
		    ]
	};

	function Maze(props){
		ImageFactory = new ImageFactory();
		this.init(props);
	}

	Maze.prototype = {
		currentDirection : defaultDirection,
		width : 0,
		height : 0,
		cells : [],
		getEndNode : function(){
			return end;
		},
		init : function(props){
			ImageFactory.loadImage('hero');
			this.width = props.width;
			this.height = props.height;
			this.createCells(props.cells);
			end = this.getRandomPosition();
			setInterval(function(){
				this.currentDirection.index += 1;
				if(this.currentDirection.index === 3){
					this.currentDirection.index = 0;
				}
			}.bind(this), 1000 / 5);
		},
		createCells : function(rawCells){
			for (var i = 0; i < rawCells.length; i++) {
		        this.cells[i] = [];
		        for (var j = 0; j < rawCells[i].length; j++) {
		            this.cells[i][j] = new Cell(rawCells[i][j]);
		        }
		    }
		},
		draw : function(context){
			this.fillCell(context,this.cells[end.x][end.y], "red");
			this.cells.forEach(function (rows) {
				rows.forEach(function(cell){
					cell.draw(context);
				});
			});
		},
		isInvalidMove : function(currentNode,nextNode){

        	if(nextNode.x > currentNode.x && currentNode.walls.right){
        		return true;
        	}

        	if(nextNode.y < currentNode.y && currentNode.walls.top){
        		return true;
        	}

        	if(nextNode.y > currentNode.y && currentNode.walls.bottom){
        		return true;
        	}

        	if(nextNode.x < currentNode.x && currentNode.walls.left){
        		return true;
        	}
		},
		fillCell : function(context,cell,color){
			context.fillStyle = color;
			var x = (cell.x * cell.width) + 5;
			var y = (cell.y * cell.height) + 5;
			context.fillRect(x,y,cell.width / 2,cell.height / 2);
		},
		drawSprite : function(context,sprite,nextMove){
			var cell = nextMove.move;
			var x = cell.x * cell.width;
			var y = cell.y * cell.height;
			var image = ImageFactory.getImage(sprite.image);
			var positions = null;
			var pos = this.currentDirection.positions[0];

			if(nextMove.direction){
				positions = this.getSpritePosition(nextMove.direction);
				if(nextMove.direction !== this.currentDirection.direction){
					this.currentDirection.index = 0;
					this.currentDirection.direction = nextMove.direction;
					this.currentDirection.positions = positions;
				}
				pos = this.currentDirection.positions[this.currentDirection.index];
			}

			context.drawImage(image, 
				pos.x * cell.width, 
				pos.y * cell.height, 
				cell.width, 
				cell.height, 
				x, 
				y, 
				cell.width, 
				cell.height);
		},
		getSpritePosition : function(direction){
			var positions = [];
			switch(direction){
                case 'bottom': 
                positions = [
                	{x : 0 ,y : 0},
                	{x : 1 ,y : 0},
                	{x : 2 ,y : 0}
                ];  
                break;
                case 'right':  
	                positions = [
	                	{x : 3 ,y : 0},
	                	{x : 4 ,y : 0},
	                	{x : 5 ,y : 0}
	                ];
                break;
                case 'left': 
                	positions = [
	                	{x : 6 ,y : 0},
	                	{x : 7 ,y : 0},
	                	{x : 8 ,y : 0}
	                ];
                break;
                case 'top': 
                	positions = [
	                	{x : 9 ,y : 0},
	                	{x : 10 ,y : 0},
	                	{x : 11 ,y : 0}
	                ];
                break;
            }
            return positions;
		},
		clearCell : function(context,cell){
			var x = (cell.x * cell.width) + 5;
			var y = (cell.y * cell.height) + 5;
			context.clearRect(x,y,cell.width / 2,cell.height / 2);
		},
		getRandomPosition:function(){
			return {
				x : Math.floor(Math.random() * this.width),
        		y : Math.floor(Math.random() * this.height)
			}
		}
	};

	return Maze;

}());