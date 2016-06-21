module.exports = (function(){

	function UserInteraction(props){
		this.init(props);
	}

	UserInteraction.prototype = {
		cells : [],
		cell : null,
		x : 0,
		y : 0,
		moves : [],
		init : function(props){
			this.cell = props.cell;
			this.cells = props.cells;
			this.moves = [];
			this.x = 0;
			this.y = 0;
		},
		isComplete : function(){
			console.log("Is Complete " + this.cell.x + " " + this.cell.y);
			return this.cell.x === this.cells.length - 1 && this.cell.y === this.cells[0].length - 1;
		},
		moveTo : function(direction){
			if(!this.canMoveTo(direction)){
				return null;
			}
			var nextMove = this.getNextMove(direction);
			this.moves.push(nextMove);
			return nextMove;
		},
		canMoveTo : function(direction){
			var lastMove = this.moves[this.moves.length - 1] || this.getSingleMove();
			return lastMove.walls[direction] === null;
		},
		getNextMove : function(direction){

			switch(direction){
				case 'left' : 
				this.cell.x-=1;
				break;
				case 'rigth' : 
				this.cell.x += 1;
				break;
				case 'bottom' : 
				this.cell.y += 1;
				break;
				case 'top' : 
				this.cell.y -= 1;
				break;
			}

			return this.getSingleMove();
			
		},
		getSingleMove : function(){
			var initialNode = this.cells[this.cell.x][this.cell.y];

			return {
				x : initialNode.x,
				y : initialNode.y,
				width : initialNode.width,
				height : initialNode.height,
				walls : {
					rigth : initialNode.walls.rigth,
					left : initialNode.walls.left,
					top : initialNode.walls.top,
					bottom : initialNode.walls.bottom
				}
			};
		},
		run : function(){
			//this method could be overrided by user
		},
	};


	return UserInteraction;

}());