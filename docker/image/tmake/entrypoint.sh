#!/bin/bash

# This is the entrypoint script for the dockerfile. Executed in the
# container at runtime.

if [[ $# == 0 ]]; then
    # Presumably the image has been run directly, so help the user get started.
    cat /tmake/tmake
    exit 0
fi

# If we are running docker natively, we want to create a user in the container
# with the same UID and GID as the user on the host machine, so that any files
# created are owned by that user. Without this they are all owned by root.
# If we are running from boot2docker, this is not necessary, and you end up not
# being able to write to the volume.
# The tmake script sets the TMAKE_UID and TMAKE_GID vars.
if [[ -n $TMAKE_UID ]] && [[ -n $TMAKE_GID ]]; then

    TMAKE_USER=tmake-user
    TMAKE_GROUP=tmake-group
    TMAKE_HOME=/home/$TMAKE_USER

    groupadd -o -g $TMAKE_GID $TMAKE_GROUP 2> /dev/null
    useradd -o -m -d $TMAKE_HOME -g $TMAKE_GID -u $TMAKE_UID $TMAKE_USER 2> /dev/null

    # Run the command as the specified user/group.
    HOME=$TMAKE_HOME exec chpst -u :$TMAKE_UID:$TMAKE_GID "$@"
else
    # Just run the command as root.
    exec "$@"
fi
