module.exports = (function(){

	var cells = [],
		end = null, 
		cell = null, 
		moves = [],
		toBePaint = [],
		movePromises = [],
		context,
		fps = 1000 / 5;

	function UserInteraction(props){
		this.init(props);
	}

	UserInteraction.prototype = {
		x : 0,
		y : 0,
		getMoves : function(){
			return moves;
		},
		getToPaint : function(){
			return toBePaint;
		},
		init : function(props){
			cell = props.cell;
			end = props.end;
			cells = props.cells;
			moves = [];
			toBePaint = [];
			movePromises.forEach(function(promise){
				clearTimeout(promise);
			});
			this.x = 0;
			this.y = 0;
		},
		isComplete : function(){
			return cell.x === end.x && cell.y === end.y;
		},
		moveTo : function(direction){
			var nextMove = this.getNextMove(direction);
			moves.push(nextMove);
			movePromises.push(setTimeout(function(){
				toBePaint.push({
					move : nextMove,
					direction : direction
				});
			}.bind(this), moves.length * fps));
			return nextMove;
		},
		canMoveTo : function(direction){
			var lastMove = moves[moves.length - 1] || this.getSingleMove();
			return lastMove.walls[direction] === null;
		},
		getNextMove : function(direction){

			switch(direction){
				case 'left' : 
				cell.x-=1;
				break;
				case 'right' : 
				cell.x += 1;
				break;
				case 'bottom' : 
				cell.y += 1;
				break;
				case 'top' : 
				cell.y -= 1;
				break;
			}

			var result = this.getSingleMove();

			this.x = result.x;
			this.y = result.y;

			return result;
			
		},
		getSingleMove : function(){
			var initialNode = cells[cell.x][cell.y];

			return {
				x : initialNode.x,
				y : initialNode.y,
				width : initialNode.width,
				height : initialNode.height,
				walls : {
					right : initialNode.walls.right,
					left : initialNode.walls.left,
					top : initialNode.walls.top,
					bottom : initialNode.walls.bottom
				}
			};
		},
		execute : function(runFunction){
			if(runFunction && typeof runFunction === "function"){
				runFunction();
				console.log(moves.length);
			}
		},
	};


	return UserInteraction;

}());