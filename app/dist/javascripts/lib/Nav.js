(function(){
	function Nav() {
		const _$e = $(`
			<div id="Nav">
				<div id="Top">
					<div align=left class="left">
						<div class="logo">
							PennyEther
						</div>
					</div>
					<div align=right class="middle">
					</div>
					<div align=right class="right">
						<div id="EthStatusGoesHere"></div>
					</div>
				</div>
				<div id="Breadcrumb">
					<div class="subMenuItem">Page 1</div>
					<div class="subMenuItem">Page 2</div>
					<div class="subMenuItem">Page 3</div>
					<div class="subMenuItem">Page 4</div>
				</div>
			</div>
		`);
		const _$menu = _$e.find(".middle");
		const _$status = _$e.find(".right");
		const _$breadcrumb = _$e.find("#Breadcrumb");

		const _siteMap = [
			{
				name: "Games",
				url: "/allgames.html",
				children: []
			},
			{
				name: "About",
				url: "/about.html",
				children: []
			},
			{
				name: "Status",
				url: "/status/finances",
				children: [{
					name: "Finances",
					url: "/status/finances.html"
				},{
					name: "System",
					url: "/status/system.html"
				},{
					name: "Games",
					url: "/status/games.html"
				}]
			},
			{
				name: "Tokens",
				url: "/tokens/index.html",
				children: []
			}
		];

		_init();

		function _init() {
			var breadcrumb = [];
			const curUrl = window.location.pathname.toLowerCase();
			_$menu.empty();
			_siteMap.forEach(obj=>{
				// add menu item, set as breadcrumb (if there is none)
				const $e = $(`<div class='menuItem'></div>`)
					.append($("<div></div>").text(obj.name))
					.appendTo(_$menu);
				if (obj.url.toLowerCase() == curUrl) {
					$e.addClass("on");
					if (breadcrumb.length==0) breadcrumb = [obj];
				}
				const children = obj.children || [];
				if (!children.length) return;

				// there are children. add a submenu.
				// if we find a matching url, set to breadcrumb
				// unless we already have a 2-level breadcrumb.
				const $sub = $(`<div class='subMenu'></div>`);
				children.forEach(child=>{
					const $child = $(`<div class='subItem'></div>`)
						.text(child.name)
						.appendTo($sub);

					if (child.url == curUrl) {
						$child.addClass("on");
						if (breadcrumb.length!=2){
							breadcrumb = [obj, child];
							$e.addClass("on");
						}
					}
				});
				$sub.appendTo($e);
			});

			_$breadcrumb.empty();
			if (breadcrumb.length) {
				const curPage = breadcrumb.pop();
				const $curPage = $("<div></div>")
					.addClass("curPage")
					.text(curPage.name)
					.prependTo(_$breadcrumb);
			}
			if (breadcrumb.length) {
				const parent = breadcrumb.pop();
				const $parent = $("<div></div>")
					.addClass("parent")
					.text(parent.name)
					.prependTo(_$breadcrumb);
			}
		}

		this.$e = _$e;
		this.setEthStatusElement = function($e) {
			_$status.empty().append($e)
		}
	}
	window.Nav = Nav;
}())