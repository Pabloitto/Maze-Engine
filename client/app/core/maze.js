module.exports = (function(){

	var Cell = require("./cell");
	var end = null;

	function Maze(props){
		this.init(props);
	}

	Maze.prototype = {
		width : 0,
		height : 0,
		cells : [],
		getEndNode : function(){
			return end;
		},
		init : function(props){
			this.width = props.width;
			this.height = props.height;
			this.createCells(props.cells);
			end = this.getRandomPosition();
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