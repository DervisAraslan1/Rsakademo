const bcrypt = require("bcrypt");
(async () => {
    const hash = await bcrypt.hash("superadmin123", 10);
    console.log(hash);
})();
