module.exports = (function(){
	
	var Config = require("../../client/app/core/config-maze");

	function MazeGenerator(props){
		if(props){
			if(props.cells){
				this.width = props.cells.length;
				this.height = props.cells[0].length;
				this.cells = props.cells;
			}else{
				this.width = props.width;
				this.height = props.height;
				this.init();
			}
		}
	}

	MazeGenerator.prototype = {
		names : ["left","right","top","bottom"],
		width : 0,
		height : 0,
		cells : [],
		init : function(){
			this.createCells();
			this.createMaze();
		},
		createMaze : function(){
			var initialPosition = this.getRandomPosition();
			var initialCell = this.cells[initialPosition.x][initialPosition.y];
			if(initialCell){
				this.moveTo(initialCell);
			}
		},
		moveTo: function(cell,direction){

			cell.visited = true;
	        if (direction) {
	            cell.walls[direction] = null;
	        }

	        var moves = this.getNewMove(cell);

	        while (moves.length > 0) {

	            var index = Math.floor(Math.random() * moves.length);

	            var nextCell = moves[index];
	            
	            if (cell.y > nextCell.y) {
	                cell.walls.top = null;
	                this.moveTo(nextCell, "bottom");
	            } else if (cell.x < nextCell.x) {
	                cell.walls.right = null;
	                this.moveTo(nextCell, "left");
	            } else if (cell.y < nextCell.y) {
	                cell.walls.bottom = null;
	                this.moveTo(nextCell, "top");
	            } else if (cell. x > nextCell.x) {
	                cell.walls.left = null;
	                this.moveTo(nextCell, "right");
	            }

	            moves = this.getNewMove(cell);
	        }
		},
		getNewMove:function(cell,checkWalls){
			var moves = [
		        this.checkMove(cell, cell.x, cell.y - 1,checkWalls),
		        this.checkMove(cell, cell.x + 1, cell.y,checkWalls),
		        this.checkMove(cell, cell.x, cell.y + 1,checkWalls), 
		        this.checkMove(cell, cell.x - 1, cell.y,checkWalls)
	        ];

	        return moves.filter(function(m){
	        	return m !== undefined;
	        });
		},
		checkMove:function(cell, x, y, checkWalls) {

            if (checkWalls) {
                if ((y < cell.y && cell.walls.top) ||
                    (x > cell.x && cell.walls.right) ||
                    (y > cell.y && cell.walls.bottom) ||
                    (x < cell.x && cell.walls.left)) {
                    return;
                }
            }
                        
            if (this.cells[x] && this.cells[x][y] && !this.cells[x][y].visited) {
                return this.cells[x][y];
            }
	    },
	    getSolutionPath : function(startX, startY, endX, endY){

	        for (var x = 0; x < this.cells.length; x++) {
	            for (var y = 0; y < this.cells[x].length; y++) {
	                this.cells[x][y].visited = false;
	            }
	        }

	        var solution = [],
	            cell = this.cells[startX][startY],
	            moves = [];

	        while (cell && ((cell.x != endX) || (cell.y != endY))) {
	            cell.visited = true;
	            moves = this.getNewMove(cell, true);

	            if (moves.length === 0 && solution.length > 0) {
	                cell = solution.pop();
	            } else {
	                solution.push(cell);
	                cell = moves[0];
	            }
	        }

	        solution.push(cell);

	        return solution;
		},
		getRandomPosition:function(){
			return {
				x : Math.floor(Math.random() * this.width),
        		y : Math.floor(Math.random() * this.height)
			}
		},
		createCells : function(){
			for (var i = 0; i < this.width; i++) {
		        this.cells[i] = [];
		        for (var j = 0; j < this.height; j++) {
		            this.cells[i][j] = this.createSingleCell(i,j);
		        }
		    }
		},
		createSingleCell : function(i,j){
			var cell = {
		    	x : i,
		    	y : j,
		    	width : Config.CELL_SIZE,
		    	height : Config.CELL_SIZE,
		    	visited : false
		    };	

		    cell.walls = this.createWallObject(cell);

		    return cell;
		},
		createWallObject : function(cell){
			var walls = {};
			this.names.forEach(function(name){
				walls[name] = {
					name : name,
					x : cell.x,
					y : cell.y,
					height : cell.height,
					width : cell.width
				};
			});
			return walls;
		}
	};

	return MazeGenerator;

}());