module.exports = (function(){

	var Cell = require("./cell");

	function Maze(props){
		this.init(props);
	}

	Maze.prototype = {
		width : 0,
		height : 0,
		cells : [],
		solution : [],
		animationInterval : null,
		mainInterval : null,
		lastNode : null,
		init : function(props){
			this.width = props.cells.length;
			this.height = props.cells[0].length;
			this.createCells(props.cells);
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
			this.fillCell(context,this.cells[0][0], "blue");
			this.fillCell(context,this.cells[this.width - 1][this.height - 1], "red");

			this.cells.forEach(function (rows) {
				rows.forEach(function(cell){
					cell.draw(context);
				});
			});
		},
		drawSolution : function(context,sol){

			this.solution = sol;

			this.lastNode = this.cells[0][0];

            this.animationInterval = requestAnimationFrame(this.animatePath.bind(this,context));

            this.mainInterval = setInterval(function(){
            	this.animatePath(context);
            }.bind(this),250);

		},
		animatePath:function(context){
        	
			if(this.solution.length === 0){
				this.clearCell(context,this.lastNode);
				this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation();
        		return;
        	}

        	this.clearCell(context,this.lastNode);

        	
        	var cell = this.solution.shift();
        	
        	if(Math.abs(cell.x - this.lastNode.x) > 1 ||
        		Math.abs(cell.y - this.lastNode.y) > 1){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation();
        		return;
        	}

        	if(cell.x > this.lastNode.x && this.lastNode.walls.rigth){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation();
        		return;
        	}

        	if(cell.y < this.lastNode.y && this.lastNode.walls.top){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation()
        		return;
        	}

        	if(cell.y > this.lastNode.y && this.lastNode.walls.bottom){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation();
        		return;
        	}

        	if(cell.x < this.lastNode.x && this.lastNode.walls.left){
        		this.fillCell(context,this.cells[0][0], "blue");
        		this.stopAnimation()
        		return;
        	}

        	this.fillCell(context,cell, "blue");
        	
        	this.lastNode = cell;
		},
		stopAnimation : function(){
			cancelAnimationFrame(this.animationInterval);
        	clearInterval(this.mainInterval);
        	this.animationInterval = null;
        	this.mainInterval = null;
		},
		fillCell : function(context,cell,color){
			context.fillStyle = color;
			var x = (cell.x * cell.width) + 5;
			var y = (cell.y * cell.height) + 5;
			context.fillRect(x,y,cell.width / 2,cell.height / 2);
		},
		clearCell : function(context,cell){
			var x = (cell.x * cell.width) + 5;
			var y = (cell.y * cell.height) + 5;
			context.clearRect(x,y,cell.width / 2,cell.height / 2);
		}
	};

	return Maze;

}());