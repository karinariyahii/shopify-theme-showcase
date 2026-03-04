module.exports = {
	EVENTS: {
		cartUpdated: 'cart-updated'
	},
	subscribers: {},
	subscribe: function (eventName, callback) {
		if (this.subscribers[eventName] === undefined) {
			this.subscribers[eventName] = [];
		}

		this.subscribers[eventName] = [...this.subscribers[eventName], callback];

		return () => {
			this.subscribers[eventName] = this.subscribers[eventName].filter((cb) => {
				return cb !== callback;
			});
		};
	},
	publish: function (eventName, data) {
		if (this.subscribers[eventName]) {
			this.subscribers[eventName].forEach((callback) => {
				callback(data);
			});
		}
	}
}
