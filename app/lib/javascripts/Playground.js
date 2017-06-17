(function(){
	function Playground(){
		var _$ = $(`
			<div class='ctnr'></div>
		`);

		this.get$ = () => _$;
	}

	function Instance(inst){
		var _$ = $(`
			<div class='ctnr'>
				<div class='title'>
					<div class='name'>name</div>
					<div class='address'>address</div>
					<div class='balance'>balance</div>
					<div class='remove'>remove</div>
				</div>
				<div class='info'>
					<div class=''
				</div>
			</div>
		`)
	}
}())