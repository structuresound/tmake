#include <stdio.h>

#include "foo.h"
#include "bar.h"

int main()
{
    const int    new_bar_spam = 3;
    const double new_bar_eggs = 5.0f;

    printf("foo: spam = %d, eggs = %f\n", spam(), eggs() );
    printf("bar: old spam = %d, new spam = %d ; old eggs = %f, new eggs = %f\n",
            spam(new_bar_spam), new_bar_spam,
            eggs(new_bar_eggs), new_bar_eggs );

    return 0;
}
