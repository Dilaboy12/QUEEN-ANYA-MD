const commands = [];

function cmd(info, handler) {
    if (!info || !info.pattern) {
        throw new Error("Command pattern is required");
    }

    commands.push({
        ...info,
        handler
    });

    return handler;
}

module.exports = {
    cmd,
    commands
};
